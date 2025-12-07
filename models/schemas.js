// Схеми валідації для колекцій MongoDB

const userSchema = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['username', 'email', 'role', 'createdAt'],
    properties: {
      username: {
        bsonType: 'string',
        description: 'Ім\'я користувача (обов\'язкове)',
        minLength: 3,
        maxLength: 50
      },
      email: {
        bsonType: 'string',
        pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
        description: 'Email адреса (обов\'язкове)'
      },
      password: {
        bsonType: 'string',
        description: 'Хеш пароля'
      },
      role: {
        enum: ['author', 'reader', 'admin'],
        description: 'Роль користувача (обов\'язкове)'
      },
      profile: {
        bsonType: 'object',
        properties: {
          firstName: { bsonType: 'string' },
          lastName: { bsonType: 'string' },
          bio: { bsonType: 'string' },
          avatar: { bsonType: 'string' }
        }
      },
      createdAt: {
        bsonType: 'date',
        description: 'Дата створення (обов\'язкове)'
      },
      lastLogin: {
        bsonType: 'date'
      },
      notifications: {
        bsonType: 'array',
        items: {
          bsonType: 'object',
          properties: {
            type: { bsonType: 'string' },
            message: { bsonType: 'string' },
            postId: { bsonType: 'objectId' },
            read: { bsonType: 'bool' },
            createdAt: { bsonType: 'date' }
          }
        }
      }
    }
  }
};

const postSchema = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['title', 'content', 'authorId', 'categoryId', 'createdAt', 'status'],
    properties: {
      title: {
        bsonType: 'string',
        description: 'Назва поста (обов\'язкове)',
        minLength: 5,
        maxLength: 200
      },
      content: {
        bsonType: 'string',
        description: 'Зміст поста (обов\'язкове)',
        minLength: 50
      },
      authorId: {
        bsonType: 'objectId',
        description: 'ID автора (обов\'язкове)'
      },
      categoryId: {
        bsonType: 'objectId',
        description: 'ID категорії (обов\'язкове)'
      },
      tags: {
        bsonType: 'array',
        items: {
          bsonType: 'string'
        },
        description: 'Масив тегів'
      },
      comments: {
        bsonType: 'array',
        items: {
          bsonType: 'object',
          required: ['userId', 'content', 'createdAt', 'status'],
          properties: {
            _id: { bsonType: 'objectId' },
            userId: { bsonType: 'objectId' },
            content: { bsonType: 'string', minLength: 1 },
            createdAt: { bsonType: 'date' },
            updatedAt: { bsonType: 'date' },
            status: {
              enum: ['pending', 'approved', 'rejected'],
              description: 'Статус модерації'
            },
            likes: { bsonType: 'int', minimum: 0 },
            dislikes: { bsonType: 'int', minimum: 0 },
            parentCommentId: {
              bsonType: ['objectId', 'null'],
              description: 'ID батьківського коментаря для вкладених коментарів'
            },
            replies: {
              bsonType: 'array',
              items: { bsonType: 'object' }
            }
          }
        }
      },
      rating: {
        bsonType: 'object',
        properties: {
          likes: { bsonType: 'int', minimum: 0 },
          dislikes: { bsonType: 'int', minimum: 0 },
          users: {
            bsonType: 'array',
            items: {
              bsonType: 'object',
              properties: {
                userId: { bsonType: 'objectId' },
                type: { enum: ['like', 'dislike'] }
              }
            }
          }
        }
      },
      views: {
        bsonType: 'int',
        minimum: 0,
        description: 'Кількість переглядів'
      },
      status: {
        enum: ['draft', 'published', 'archived'],
        description: 'Статус поста (обов\'язкове)'
      },
      createdAt: {
        bsonType: 'date',
        description: 'Дата створення (обов\'язкове)'
      },
      updatedAt: {
        bsonType: 'date'
      },
      publishedAt: {
        bsonType: 'date'
      },
      location: {
        bsonType: 'object',
        properties: {
          type: { enum: ['Point'] },
          coordinates: {
            bsonType: 'array',
            items: { bsonType: 'double' },
            minItems: 2,
            maxItems: 2
          }
        },
        description: 'Геолокація (GeoJSON Point)'
      },
      versions: {
        bsonType: 'array',
        items: {
          bsonType: 'object',
          properties: {
            title: { bsonType: 'string' },
            content: { bsonType: 'string' },
            editedAt: { bsonType: 'date' },
            editedBy: { bsonType: 'objectId' }
          }
        },
        description: 'Історія версій поста'
      },
      metadata: {
        bsonType: 'object',
        properties: {
          readingTime: { bsonType: 'int' },
          wordCount: { bsonType: 'int' },
          featured: { bsonType: 'bool' }
        }
      }
    }
  }
};

const categorySchema = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['name', 'slug', 'createdAt'],
    properties: {
      name: {
        bsonType: 'string',
        description: 'Назва категорії (обов\'язкове)',
        minLength: 2,
        maxLength: 50
      },
      slug: {
        bsonType: 'string',
        description: 'URL-дружня назва (обов\'язкове)',
        pattern: '^[a-z0-9-]+$'
      },
      description: {
        bsonType: 'string',
        description: 'Опис категорії'
      },
      color: {
        bsonType: 'string',
        description: 'Колір для відображення'
      },
      createdAt: {
        bsonType: 'date',
        description: 'Дата створення (обов\'язкове)'
      },
      postCount: {
        bsonType: 'int',
        minimum: 0,
        description: 'Кількість постів у категорії'
      }
    }
  }
};

module.exports = {
  userSchema,
  postSchema,
  categorySchema
};

