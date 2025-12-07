const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { connectDatabase, closeDatabase } = require('./config/database');
const { ObjectId } = require('mongodb');
const NodeCache = require('node-cache');
const {
  getTopAuthors,
  getPopularCategories,
  getCommentStatistics,
  getPostsByTags,
  fullTextSearch,
  getPostsPaginated,
  getViewStatistics,
  getPostsByLocation,
  getAnalytics
} = require('./models/aggregations');

const app = express();
const PORT = process.env.PORT || 3000;

// Кеш для популярних запитів (TTL 5 хвилин)
const cache = new NodeCache({ stdTTL: 300 });

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

const { getDatabase } = require('./config/database');

// ========== РІВЕНЬ 1: Базові функції ==========

// Отримати список постів з пагінацією
app.get('/api/posts', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const categoryId = req.query.categoryId || null;
    const authorId = req.query.authorId || null;
    const tags = req.query.tags ? req.query.tags.split(',') : null;
    const sortBy = req.query.sortBy || 'publishedAt';
    const sortOrder = parseInt(req.query.sortOrder) || -1;
    
    const result = await getPostsPaginated({
      page,
      limit,
      categoryId,
      authorId,
      tags,
      sortBy,
      sortOrder
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Отримати детальну інформацію про пост
app.get('/api/posts/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const postId = req.params.id;
    
    // Інкрементація переглядів
    await db.collection('posts').updateOne(
      { _id: new ObjectId(postId) },
      { $inc: { views: 1 } }
    );
    
    const pipeline = [
      { $match: { _id: new ObjectId(postId) } },
      {
        $lookup: {
          from: 'users',
          localField: 'authorId',
          foreignField: '_id',
          as: 'author'
        }
      },
      { $unwind: '$author' },
      {
        $lookup: {
          from: 'categories',
          localField: 'categoryId',
          foreignField: '_id',
          as: 'category'
        }
      },
      { $unwind: '$category' },
      {
        $project: {
          title: 1,
          content: 1,
          authorId: 1,
          authorName: { $concat: ['$author.profile.firstName', ' ', '$author.profile.lastName'] },
          authorUsername: '$author.username',
          categoryId: 1,
          categoryName: '$category.name',
          categorySlug: '$category.slug',
          tags: 1,
          comments: 1,
          rating: 1,
          views: 1,
          createdAt: 1,
          publishedAt: 1,
          location: 1,
          versions: 1,
          metadata: 1
        }
      }
    ];
    
    const posts = await db.collection('posts').aggregate(pipeline).toArray();
    
    if (posts.length === 0) {
      return res.status(404).json({ error: 'Пост не знайдено' });
    }
    
    res.json(posts[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Топ 10 авторів
app.get('/api/authors/top', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const cacheKey = `top_authors_${limit}`;
    
    let authors = cache.get(cacheKey);
    if (!authors) {
      authors = await getTopAuthors(limit);
      cache.set(cacheKey, authors);
    }
    
    res.json(authors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Популярні категорії
app.get('/api/categories/popular', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const cacheKey = `popular_categories_${limit}`;
    
    let categories = cache.get(cacheKey);
    if (!categories) {
      categories = await getPopularCategories(limit);
      cache.set(cacheKey, categories);
    }
    
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Статистика коментарів
app.get('/api/statistics/comments', async (req, res) => {
  try {
    const stats = await getCommentStatistics();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Отримати всі категорії
app.get('/api/categories', async (req, res) => {
  try {
    const db = getDatabase();
    const categories = await db.collection('categories').find({}).toArray();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== РІВЕНЬ 2: Розширені функції ==========

// Пошук постів за тегами
app.get('/api/posts/search/tags', async (req, res) => {
  try {
    const tags = req.query.tags ? req.query.tags.split(',') : [];
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    if (tags.length === 0) {
      return res.status(400).json({ error: 'Необхідно вказати теги' });
    }
    
    const result = await getPostsByTags(tags, { page, limit });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Повнотекстовий пошук
app.get('/api/posts/search/text', async (req, res) => {
  try {
    const searchText = req.query.q;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    if (!searchText) {
      return res.status(400).json({ error: 'Необхідно вказати пошуковий запит' });
    }
    
    const result = await fullTextSearch(searchText, { page, limit });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Додати лайк/дизлайк до поста
app.post('/api/posts/:id/rating', async (req, res) => {
  try {
    const db = getDatabase();
    const postId = req.params.id;
    const { userId, type } = req.body; // type: 'like' або 'dislike'
    
    if (!userId || !type || !['like', 'dislike'].includes(type)) {
      return res.status(400).json({ error: 'Некоректні дані' });
    }
    
    const post = await db.collection('posts').findOne({ _id: new ObjectId(postId) });
    if (!post) {
      return res.status(404).json({ error: 'Пост не знайдено' });
    }
    
    // Перевірка чи користувач вже оцінив
    const existingRating = post.rating.users.find(u => u.userId.toString() === userId);
    
    if (existingRating) {
      // Якщо той самий тип - видалити оцінку
      if (existingRating.type === type) {
        await db.collection('posts').updateOne(
          { _id: new ObjectId(postId) },
          {
            $pull: { 'rating.users': { userId: new ObjectId(userId) } },
            $inc: { [`rating.${type}s`]: -1 }
          }
        );
        return res.json({ message: 'Оцінку видалено', removed: true });
      } else {
        // Змінити тип оцінки
        await db.collection('posts').updateOne(
          { _id: new ObjectId(postId) },
          {
            $set: { 'rating.users.$[elem].type': type },
            $inc: {
              [`rating.${type}s`]: 1,
              [`rating.${existingRating.type}s`]: -1
            }
          },
          { arrayFilters: [{ 'elem.userId': new ObjectId(userId) }] }
        );
        return res.json({ message: 'Оцінку оновлено' });
      }
    } else {
      // Додати нову оцінку
      await db.collection('posts').updateOne(
        { _id: new ObjectId(postId) },
        {
          $push: { 'rating.users': { userId: new ObjectId(userId), type } },
          $inc: { [`rating.${type}s`]: 1 }
        }
      );
      return res.json({ message: 'Оцінку додано' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Статистика переглядів
app.get('/api/statistics/views', async (req, res) => {
  try {
    const stats = await getViewStatistics();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Додати коментар
app.post('/api/posts/:id/comments', async (req, res) => {
  try {
    const db = getDatabase();
    const postId = req.params.id;
    const { userId, content, parentCommentId } = req.body;
    
    if (!userId || !content) {
      return res.status(400).json({ error: 'Необхідно вказати userId та content' });
    }
    
    const comment = {
      _id: new ObjectId(),
      userId: new ObjectId(userId),
      content: content,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'pending', // Потребує модерації
      likes: 0,
      dislikes: 0,
      parentCommentId: parentCommentId ? new ObjectId(parentCommentId) : null,
      replies: []
    };
    
    if (parentCommentId) {
      // Вкладений коментар (відповідь)
      await db.collection('posts').updateOne(
        { _id: new ObjectId(postId), 'comments._id': new ObjectId(parentCommentId) },
        { $push: { 'comments.$.replies': comment } }
      );
    } else {
      // Звичайний коментар
      await db.collection('posts').updateOne(
        { _id: new ObjectId(postId) },
        { $push: { comments: comment } }
      );
    }
    
    // Створити сповіщення для автора поста
    const post = await db.collection('posts').findOne({ _id: new ObjectId(postId) });
    if (post) {
      await db.collection('users').updateOne(
        { _id: post.authorId },
        {
          $push: {
            notifications: {
              type: 'new_comment',
              message: `Новий коментар до вашого поста "${post.title}"`,
              postId: new ObjectId(postId),
              read: false,
              createdAt: new Date()
            }
          }
        }
      );
    }
    
    res.json({ message: 'Коментар додано', comment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Модерація коментарів
app.patch('/api/posts/:postId/comments/:commentId', async (req, res) => {
  try {
    const db = getDatabase();
    const { postId, commentId } = req.params;
    const { status } = req.body; // 'pending', 'approved', 'rejected'
    
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Некоректний статус' });
    }
    
    await db.collection('posts').updateOne(
      { _id: new ObjectId(postId), 'comments._id': new ObjectId(commentId) },
      { $set: { 'comments.$.status': status } }
    );
    
    res.json({ message: 'Статус коментаря оновлено' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Додати новий пост
app.post('/api/posts', async (req, res) => {
  try {
    const db = getDatabase();
    const {
      title,
      content,
      authorId,
      categoryId,
      tags = [],
      location = null
    } = req.body;
    
    if (!title || !content || !authorId || !categoryId) {
      return res.status(400).json({ error: 'Необхідно заповнити всі обов\'язкові поля' });
    }
    
    const wordCount = content.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200);
    
    const post = {
      title,
      content,
      authorId: new ObjectId(authorId),
      categoryId: new ObjectId(categoryId),
      tags: Array.isArray(tags) ? tags : [],
      comments: [],
      rating: {
        likes: 0,
        dislikes: 0,
        users: []
      },
      views: 0,
      status: 'published',
      createdAt: new Date(),
      updatedAt: new Date(),
      publishedAt: new Date(),
      location: location ? {
        type: 'Point',
        coordinates: [location.longitude, location.latitude]
      } : null,
      versions: [],
      metadata: {
        readingTime,
        wordCount,
        featured: false
      }
    };
    
    const result = await db.collection('posts').insertOne(post);
    
    // Оновити кількість постів у категорії
    await db.collection('categories').updateOne(
      { _id: new ObjectId(categoryId) },
      { $inc: { postCount: 1 } }
    );
    
    res.status(201).json({ message: 'Пост створено', postId: result.insertedId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== РІВЕНЬ 3: Продвинуті функції ==========

// Версіонування поста (збереження історії редагувань)
app.put('/api/posts/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const postId = req.params.id;
    const { title, content, editedBy } = req.body;
    
    const post = await db.collection('posts').findOne({ _id: new ObjectId(postId) });
    if (!post) {
      return res.status(404).json({ error: 'Пост не знайдено' });
    }
    
    // Зберегти поточну версію в історію
    const version = {
      title: post.title,
      content: post.content,
      editedAt: new Date(),
      editedBy: editedBy ? new ObjectId(editedBy) : post.authorId
    };
    
    await db.collection('posts').updateOne(
      { _id: new ObjectId(postId) },
      {
        $set: {
          title: title || post.title,
          content: content || post.content,
          updatedAt: new Date()
        },
        $push: { versions: { $each: [version], $slice: -10 } } // Зберігати останні 10 версій
      }
    );
    
    res.json({ message: 'Пост оновлено, версія збережена' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Отримати історію версій поста
app.get('/api/posts/:id/versions', async (req, res) => {
  try {
    const db = getDatabase();
    const post = await db.collection('posts').findOne(
      { _id: new ObjectId(req.params.id) },
      { projection: { versions: 1, title: 1 } }
    );
    
    if (!post) {
      return res.status(404).json({ error: 'Пост не знайдено' });
    }
    
    res.json({ versions: post.versions || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Отримати сповіщення користувача
app.get('/api/users/:id/notifications', async (req, res) => {
  try {
    const db = getDatabase();
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(req.params.id) },
      { projection: { notifications: 1 } }
    );
    
    if (!user) {
      return res.status(404).json({ error: 'Користувач не знайдено' });
    }
    
    const unread = (user.notifications || []).filter(n => !n.read);
    const all = (user.notifications || []).sort((a, b) => b.createdAt - a.createdAt);
    
    res.json({ unread: unread.length, notifications: all });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Позначити сповіщення як прочитане
app.patch('/api/users/:userId/notifications/:notificationId', async (req, res) => {
  try {
    const db = getDatabase();
    await db.collection('users').updateOne(
      { _id: new ObjectId(req.params.userId), 'notifications._id': req.params.notificationId },
      { $set: { 'notifications.$.read': true } }
    );
    
    res.json({ message: 'Сповіщення позначено як прочитане' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Пошук постів за геолокацією
app.get('/api/posts/search/location', async (req, res) => {
  try {
    const longitude = parseFloat(req.query.lng);
    const latitude = parseFloat(req.query.lat);
    const maxDistance = parseInt(req.query.maxDistance) || 10000;
    
    if (!longitude || !latitude) {
      return res.status(400).json({ error: 'Необхідно вказати координати (lng, lat)' });
    }
    
    const posts = await getPostsByLocation(longitude, latitude, maxDistance);
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Аналітична панель
app.get('/api/analytics', async (req, res) => {
  try {
    const cacheKey = 'analytics_dashboard';
    let analytics = cache.get(cacheKey);
    
    if (!analytics) {
      analytics = await getAnalytics();
      cache.set(cacheKey, analytics, 600); // Кеш на 10 хвилин
    }
    
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Отримати всіх користувачів (для тестування)
app.get('/api/users', async (req, res) => {
  try {
    const db = getDatabase();
    const users = await db.collection('users').find({}).toArray();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Запуск сервера
async function startServer() {
  try {
    await connectDatabase();
    app.listen(PORT, () => {
      console.log(`🚀 Сервер запущено на http://localhost:${PORT}`);
      console.log(`📊 API доступне на http://localhost:${PORT}/api`);
      console.log(`🌐 Інтерфейс доступний на http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Помилка запуску сервера:', error);
    process.exit(1);
  }
}

// Обробка завершення
process.on('SIGINT', async () => {
  console.log('\n🛑 Зупинка сервера...');
  await closeDatabase();
  process.exit(0);
});

startServer();

module.exports = app;

