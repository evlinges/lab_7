const { getDatabase } = require('../config/database');
const { userSchema, postSchema, categorySchema } = require('./schemas');

async function createCollections() {
  const db = getDatabase();

  // Створення колекції users з валідацією
  try {
    await db.createCollection('users', {
      validator: userSchema
    });
    console.log('✅ Колекція users створена з валідацією');
  } catch (error) {
    if (error.codeName === 'NamespaceExists') {
      console.log('ℹ️ Колекція users вже існує');
    } else {
      console.error('❌ Помилка створення колекції users:', error.message);
    }
  }

  // Створення колекції posts з валідацією
  try {
    await db.createCollection('posts', {
      validator: postSchema
    });
    console.log('✅ Колекція posts створена з валідацією');
  } catch (error) {
    if (error.codeName === 'NamespaceExists') {
      console.log('ℹ️ Колекція posts вже існує');
    } else {
      console.error('❌ Помилка створення колекції posts:', error.message);
    }
  }

  // Створення колекції categories з валідацією
  try {
    await db.createCollection('categories', {
      validator: categorySchema
    });
    console.log('✅ Колекція categories створена з валідацією');
  } catch (error) {
    if (error.codeName === 'NamespaceExists') {
      console.log('ℹ️ Колекція categories вже існує');
    } else {
      console.error('❌ Помилка створення колекції categories:', error.message);
    }
  }

  // Створення індексів для оптимізації
  await createIndexes();
}

async function createIndexes() {
  const db = getDatabase();

  // Індекси для users
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  await db.collection('users').createIndex({ username: 1 }, { unique: true });
  await db.collection('users').createIndex({ role: 1 });

  // Індекси для posts
  await db.collection('posts').createIndex({ authorId: 1 });
  await db.collection('posts').createIndex({ categoryId: 1 });
  await db.collection('posts').createIndex({ createdAt: -1 });
  await db.collection('posts').createIndex({ publishedAt: -1 });
  await db.collection('posts').createIndex({ status: 1 });
  await db.collection('posts').createIndex({ tags: 1 }); // Для пошуку за тегами
  await db.collection('posts').createIndex({ 'rating.likes': -1 }); // Для сортування за рейтингом
  await db.collection('posts').createIndex({ views: -1 }); // Для популярних постів
  
  // Повнотекстовий індекс для пошуку
  await db.collection('posts').createIndex({ 
    title: 'text', 
    content: 'text' 
  }, {
    weights: {
      title: 10,
      content: 5
    },
    name: 'text_search_index'
  });

  // Геопросторовий індекс для геолокації
  await db.collection('posts').createIndex({ location: '2dsphere' });

  // Індекси для categories
  await db.collection('categories').createIndex({ slug: 1 }, { unique: true });
  await db.collection('categories').createIndex({ name: 1 });

  console.log('✅ Всі індекси створені');
}

module.exports = {
  createCollections
};

