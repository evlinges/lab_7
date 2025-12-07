const { getDatabase } = require('../config/database');
const { ObjectId } = require('mongodb');

// Топ 10 авторів за кількістю постів
async function getTopAuthors(limit = 10) {
  const db = getDatabase();
  
  const pipeline = [
    {
      $group: {
        _id: '$authorId',
        postCount: { $sum: 1 },
        totalViews: { $sum: '$views' },
        totalLikes: { $sum: '$rating.likes' }
      }
    },
    {
      $sort: { postCount: -1 }
    },
    {
      $limit: limit
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'author'
      }
    },
    {
      $unwind: '$author'
    },
    {
      $project: {
        authorId: '$_id',
        authorName: { $concat: ['$author.profile.firstName', ' ', '$author.profile.lastName'] },
        username: '$author.username',
        postCount: 1,
        totalViews: 1,
        totalLikes: 1,
        averageViews: { $divide: ['$totalViews', '$postCount'] }
      }
    }
  ];
  
  return await db.collection('posts').aggregate(pipeline).toArray();
}

// Популярні категорії за кількістю постів
async function getPopularCategories(limit = 10) {
  const db = getDatabase();
  
  const pipeline = [
    {
      $group: {
        _id: '$categoryId',
        postCount: { $sum: 1 },
        totalViews: { $sum: '$views' },
        totalComments: { $sum: { $size: '$comments' } }
      }
    },
    {
      $sort: { postCount: -1 }
    },
    {
      $limit: limit
    },
    {
      $lookup: {
        from: 'categories',
        localField: '_id',
        foreignField: '_id',
        as: 'category'
      }
    },
    {
      $unwind: '$category'
    },
    {
      $project: {
        categoryId: '$_id',
        categoryName: '$category.name',
        categorySlug: '$category.slug',
        postCount: 1,
        totalViews: 1,
        totalComments: 1
      }
    }
  ];
  
  return await db.collection('posts').aggregate(pipeline).toArray();
}

// Статистика коментарів
async function getCommentStatistics() {
  const db = getDatabase();
  
  const pipeline = [
    {
      $project: {
        commentCount: {
          $add: [
            { $size: '$comments' },
            {
              $sum: {
                $map: {
                  input: '$comments',
                  as: 'comment',
                  in: { $size: { $ifNull: ['$$comment.replies', []] } }
                }
              }
            }
          ]
        }
      }
    },
    {
      $group: {
        _id: null,
        totalComments: { $sum: '$commentCount' },
        totalPosts: { $sum: 1 },
        averageCommentsPerPost: { $avg: '$commentCount' },
        maxComments: { $max: '$commentCount' },
        minComments: { $min: '$commentCount' }
      }
    },
    {
      $project: {
        _id: 0,
        totalComments: 1,
        totalPosts: 1,
        averageCommentsPerPost: { $round: ['$averageCommentsPerPost', 2] },
        maxComments: 1,
        minComments: 1
      }
    }
  ];
  
  const result = await db.collection('posts').aggregate(pipeline).toArray();
  return result[0] || {};
}

// Пошук постів за множинними тегами
async function getPostsByTags(tags, options = {}) {
  const db = getDatabase();
  const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = -1 } = options;
  const skip = (page - 1) * limit;
  
  const query = {
    tags: { $all: tags },
    status: 'published'
  };
  
  const posts = await db.collection('posts')
    .find(query)
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(limit)
    .toArray();
  
  const total = await db.collection('posts').countDocuments(query);
  
  return {
    posts,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
}

// Повнотекстовий пошук
async function fullTextSearch(searchText, options = {}) {
  const db = getDatabase();
  const { page = 1, limit = 10 } = options;
  const skip = (page - 1) * limit;
  
  const query = {
    $text: { $search: searchText },
    status: 'published'
  };
  
  const posts = await db.collection('posts')
    .find(query, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } })
    .skip(skip)
    .limit(limit)
    .toArray();
  
  const total = await db.collection('posts').countDocuments(query);
  
  return {
    posts,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
}

// Пагінація через агрегаційний pipeline
async function getPostsPaginated(options = {}) {
  const db = getDatabase();
  const {
    page = 1,
    limit = 10,
    categoryId = null,
    authorId = null,
    tags = null,
    sortBy = 'publishedAt',
    sortOrder = -1
  } = options;
  
  const skip = (page - 1) * limit;
  
  const matchStage = { status: 'published' };
  if (categoryId) matchStage.categoryId = new ObjectId(categoryId);
  if (authorId) matchStage.authorId = new ObjectId(authorId);
  if (tags && tags.length > 0) matchStage.tags = { $all: tags };
  
  const pipeline = [
    { $match: matchStage },
    {
      $lookup: {
        from: 'users',
        localField: 'authorId',
        foreignField: '_id',
        as: 'author'
      }
    },
    {
      $unwind: '$author'
    },
    {
      $lookup: {
        from: 'categories',
        localField: 'categoryId',
        foreignField: '_id',
        as: 'category'
      }
    },
    {
      $unwind: '$category'
    },
    {
      $project: {
        title: 1,
        content: { $substr: ['$content', 0, 200] }, // Перші 200 символів
        authorId: 1,
        authorName: { $concat: ['$author.profile.firstName', ' ', '$author.profile.lastName'] },
        authorUsername: '$author.username',
        categoryId: 1,
        categoryName: '$category.name',
        categorySlug: '$category.slug',
        tags: 1,
        rating: 1,
        views: 1,
        comments: { $size: '$comments' },
        createdAt: 1,
        publishedAt: 1,
        metadata: 1
      }
    },
    { $sort: { [sortBy]: sortOrder } },
    { $skip: skip },
    { $limit: limit }
  ];
  
  const countPipeline = [
    { $match: matchStage },
    { $count: 'total' }
  ];
  
  const [posts, countResult] = await Promise.all([
    db.collection('posts').aggregate(pipeline).toArray(),
    db.collection('posts').aggregate(countPipeline).toArray()
  ]);
  
  const total = countResult[0]?.total || 0;
  
  return {
    posts,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
}

// Статистика переглядів
async function getViewStatistics() {
  const db = getDatabase();
  
  const pipeline = [
    {
      $group: {
        _id: null,
        totalViews: { $sum: '$views' },
        averageViews: { $avg: '$views' },
        maxViews: { $max: '$views' },
        minViews: { $min: '$views' },
        totalPosts: { $sum: 1 }
      }
    },
    {
      $project: {
        _id: 0,
        totalViews: 1,
        averageViews: { $round: ['$averageViews', 2] },
        maxViews: 1,
        minViews: 1,
        totalPosts: 1
      }
    }
  ];
  
  const result = await db.collection('posts').aggregate(pipeline).toArray();
  return result[0] || {};
}

// Пошук за геолокацією
async function getPostsByLocation(longitude, latitude, maxDistance = 10000) {
  const db = getDatabase();
  
  const query = {
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance // в метрах
      }
    },
    status: 'published'
  };
  
  return await db.collection('posts').find(query).limit(20).toArray();
}

// Аналітична статистика для панелі
async function getAnalytics() {
  const db = getDatabase();
  
  const [
    topAuthors,
    popularCategories,
    commentStats,
    viewStats,
    postsByStatus,
    postsByMonth
  ] = await Promise.all([
    getTopAuthors(5),
    getPopularCategories(5),
    getCommentStatistics(),
    getViewStatistics(),
    db.collection('posts').aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]).toArray(),
    db.collection('posts').aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$publishedAt' },
            month: { $month: '$publishedAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]).toArray()
  ]);
  
  return {
    topAuthors,
    popularCategories,
    commentStats,
    viewStats,
    postsByStatus,
    postsByMonth
  };
}

module.exports = {
  getTopAuthors,
  getPopularCategories,
  getCommentStatistics,
  getPostsByTags,
  fullTextSearch,
  getPostsPaginated,
  getViewStatistics,
  getPostsByLocation,
  getAnalytics
};

