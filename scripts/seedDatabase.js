const { connectDatabase, closeDatabase, getDatabase } = require('../config/database');
const { createCollections } = require('../models/collections');
const { ObjectId } = require('mongodb');

// Дані для генерації
const categories = [
  { name: 'Технології', slug: 'technology', description: 'Статті про технології та IT', color: '#3B82F6' },
  { name: 'Наука', slug: 'science', description: 'Наукові дослідження та відкриття', color: '#10B981' },
  { name: 'Освіта', slug: 'education', description: 'Освітні матеріали та методики', color: '#8B5CF6' },
  { name: 'Здоров\'я', slug: 'health', description: 'Здоров\'я та медицина', color: '#EF4444' },
  { name: 'Подорожі', slug: 'travel', description: 'Подорожі та туризм', color: '#F59E0B' },
  { name: 'Кулінарія', slug: 'cooking', description: 'Рецепти та кулінарні поради', color: '#EC4899' },
  { name: 'Спорт', slug: 'sport', description: 'Спорт та фітнес', color: '#06B6D4' },
  { name: 'Мистецтво', slug: 'art', description: 'Мистецтво та культура', color: '#F97316' },
  { name: 'Бізнес', slug: 'business', description: 'Бізнес та економіка', color: '#6366F1' },
  { name: 'Розваги', slug: 'entertainment', description: 'Розваги та медіа', color: '#14B8A6' }
];

const firstNames = ['Олександр', 'Марія', 'Дмитро', 'Анна', 'Іван', 'Олена', 'Андрій', 'Наталія', 'Сергій', 'Юлія', 'Володимир', 'Катерина', 'Олег', 'Тетяна', 'Роман', 'Ірина', 'Василь', 'Оксана', 'Михайло', 'Людмила'];
const lastNames = ['Петренко', 'Коваленко', 'Шевченко', 'Бондаренко', 'Ткаченко', 'Морозенко', 'Кравченко', 'Олійник', 'Шевчук', 'Поліщук', 'Савченко', 'Бондар', 'Ткачук', 'Мороз', 'Кравчук', 'Олійник', 'Шевчук', 'Поліщук', 'Савчук', 'Бондар'];
const roles = ['author', 'reader', 'admin'];

const postTitles = [
  'Вступ до машинного навчання: основи та застосування',
  'Як зберегти здоров\'я під час роботи за комп\'ютером',
  'Топ-10 місць для відпочинку в Україні',
  'Рецепт традиційного борщу: покрокова інструкція',
  'Фітнес-тренування вдома: ефективні вправи',
  'Сучасне мистецтво: тренди та напрямки',
  'Стартап з нуля: практичні поради',
  'Найкращі фільми 2024 року: огляд',
  'Кліматичні зміни: що ми знаємо сьогодні',
  'Освіта майбутнього: онлайн-навчання',
  'Кібербезпека: як захистити свої дані',
  'Здоровий сон: важливість та поради',
  'Подорож до Карпат: що побачити',
  'Веганська кухня: смачні рецепти',
  'Біг для початківців: як почати',
  'Сучасна архітектура: інноваційні рішення',
  'Інвестиції в криптовалюти: ризики та можливості',
  'Музика як терапія: вплив на здоров\'я',
  'Штучний інтелект в медицині',
  'Екологічний спосіб життя: практичні кроки',
  'Програмування для дітей: з чого почати',
  'Йога та медитація: корисні практики',
  'Національні парки України: природні скарби',
  'Випічка: секрети ідеального хліба',
  'Плавання: переваги для здоров\'я',
  'Сучасна література: нові імена',
  'Електронна комерція: тренди розвитку',
  'Подкасти: новий формат медіа',
  'Квантові комп\'ютери: майбутнє технологій',
  'Дієта та харчування: науковий підхід',
  'Гірський туризм: безпека та підготовка',
  'Солодощі без цукру: здорові альтернативи',
  'Теніс: правила та техніка',
  'Графічний дизайн: основи композиції',
  'Блокчейн технології: застосування',
  'Серіали: що дивитися цього сезону',
  'Робототехніка: сучасний стан',
  'Психологія споживання: як приймати рішення',
  'Велоподорожі: маршрути та поради',
  'Ферментація: традиції та інновації',
  'Бокс: техніка та тренування',
  'Фотографія: композиція та світло',
  'Фінтех: фінансові технології',
  'Аудіокниги: переваги та рекомендації',
  'Наноматеріали: застосування в промисловості',
  'Харчування дітей: здорові звички',
  'Альпінізм: безпека та екіпірування',
  'Кераміка: мистецтво та ремесло',
  'Краудфандинг: фінансування проєктів',
  'Комікси: історія та сучасність'
];

const tagsPool = [
  'технології', 'програмування', 'здоров\'я', 'подорожі', 'кулінарія', 'спорт',
  'наука', 'освіта', 'бізнес', 'мистецтво', 'розваги', 'фітнес',
  'IT', 'медицина', 'туризм', 'рецепти', 'тренування', 'дизайн',
  'інновації', 'стартапи', 'інвестиції', 'криптовалюти', 'блогінг',
  'фотографія', 'музика', 'література', 'кіно', 'театр', 'живопис'
];

function generateRandomContent() {
  const paragraphs = [
    'Ця стаття розглядає важливі аспекти теми та надає практичні поради для читачів.',
    'Дослідження показують, що правильний підхід до проблеми може значно покращити результати.',
    'Експерти в галузі рекомендують звертати увагу на деталі та не ігнорувати важливі аспекти.',
    'Практичний досвід демонструє ефективність запропонованих методів та підходів.',
    'Важливо розуміти, що кожна ситуація унікальна і потребує індивідуального підходу.',
    'Сучасні технології відкривають нові можливості для вирішення складних завдань.',
    'Дослідження та аналіз даних дозволяють зробити обґрунтовані висновки.',
    'Практика показує, що систематичний підхід є ключем до успіху в будь-якій справі.'
  ];
  
  const numParagraphs = Math.floor(Math.random() * 5) + 3;
  return Array.from({ length: numParagraphs }, () => 
    paragraphs[Math.floor(Math.random() * paragraphs.length)]
  ).join('\n\n');
}

function generateRandomTags() {
  const numTags = Math.floor(Math.random() * 4) + 2;
  const shuffled = [...tagsPool].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, numTags);
}

function generateRandomLocation() {
  // Координати України (приблизно)
  const lat = 48.0 + (Math.random() * 8); // 48-56
  const lon = 22.0 + (Math.random() * 18); // 22-40
  return {
    type: 'Point',
    coordinates: [lon, lat]
  };
}

async function seedDatabase() {
  try {
    await connectDatabase();
    await createCollections();
    
    const db = getDatabase();
    
    // Очищення колекцій
    await db.collection('users').deleteMany({});
    await db.collection('posts').deleteMany({});
    await db.collection('categories').deleteMany({});
    
    console.log('🗑️ Старі дані видалені');
    
    // Створення категорій
    const categoryDocs = categories.map(cat => ({
      ...cat,
      createdAt: new Date(),
      postCount: 0
    }));
    const categoryResult = await db.collection('categories').insertMany(categoryDocs);
    const categoryIds = Object.values(categoryResult.insertedIds);
    console.log(`✅ Створено ${categoryIds.length} категорій`);
    
    // Створення користувачів
    const userDocs = [];
    for (let i = 0; i < 20; i++) {
      const role = roles[Math.floor(Math.random() * roles.length)];
      const firstName = firstNames[i];
      const lastName = lastNames[i];
      
      userDocs.push({
        username: `${firstName.toLowerCase()}_${lastName.toLowerCase()}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
        password: 'hashed_password_' + i, // В реальності тут буде хеш
        role: role,
        profile: {
          firstName: firstName,
          lastName: lastName,
          bio: `${role === 'author' ? 'Автор статей' : role === 'admin' ? 'Адміністратор системи' : 'Читач блогу'}`,
          avatar: `https://i.pravatar.cc/150?img=${i + 1}`
        },
        createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
        lastLogin: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        notifications: []
      });
    }
    
    const userResult = await db.collection('users').insertMany(userDocs);
    const userIds = Object.values(userResult.insertedIds);
    const authorIds = userIds.filter((_, i) => userDocs[i].role === 'author' || userDocs[i].role === 'admin');
    console.log(`✅ Створено ${userIds.length} користувачів (${authorIds.length} авторів)`);
    
    // Створення постів
    const postDocs = [];
    const commentStatuses = ['pending', 'approved', 'rejected'];
    
    for (let i = 0; i < 55; i++) {
      const authorId = authorIds[Math.floor(Math.random() * authorIds.length)];
      const categoryId = categoryIds[Math.floor(Math.random() * categoryIds.length)];
      const title = postTitles[i % postTitles.length];
      const createdAt = new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000);
      const publishedAt = new Date(createdAt.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000);
      
      // Генерація коментарів (вбудованих)
      const numComments = Math.floor(Math.random() * 8) + 2; // 2-10 коментарів на пост
      const comments = [];
      
      for (let j = 0; j < numComments; j++) {
        const commentUserId = userIds[Math.floor(Math.random() * userIds.length)];
        const commentCreatedAt = new Date(publishedAt.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000);
        
        comments.push({
          _id: new ObjectId(),
          userId: commentUserId,
          content: `Це коментар ${j + 1} до поста "${title}". Дуже цікава стаття, дякую за інформацію!`,
          createdAt: commentCreatedAt,
          updatedAt: commentCreatedAt,
          status: commentStatuses[Math.floor(Math.random() * commentStatuses.length)],
          likes: Math.floor(Math.random() * 20),
          dislikes: Math.floor(Math.random() * 5),
          parentCommentId: null,
          replies: []
        });
      }
      
      // Додавання вкладених коментарів (реплів)
      const numReplies = Math.floor(comments.length * 0.3); // 30% коментарів мають відповіді
      for (let k = 0; k < numReplies && k < comments.length; k++) {
        const parentComment = comments[k];
        const numRepliesToComment = Math.floor(Math.random() * 3) + 1;
        
        for (let r = 0; r < numRepliesToComment; r++) {
          const replyUserId = userIds[Math.floor(Math.random() * userIds.length)];
          const replyCreatedAt = new Date(parentComment.createdAt.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000);
          
          parentComment.replies.push({
            _id: new ObjectId(),
            userId: replyUserId,
            content: `Відповідь на коментар: дуже згоден з вашою думкою!`,
            createdAt: replyCreatedAt,
            updatedAt: replyCreatedAt,
            status: 'approved',
            likes: Math.floor(Math.random() * 10),
            dislikes: Math.floor(Math.random() * 2),
            parentCommentId: parentComment._id
          });
        }
      }
      
      const content = generateRandomContent();
      const wordCount = content.split(/\s+/).length;
      const readingTime = Math.ceil(wordCount / 200); // Припускаємо 200 слів на хвилину
      
      postDocs.push({
        title: title,
        content: content,
        authorId: authorId,
        categoryId: categoryId,
        tags: generateRandomTags(),
        comments: comments,
        rating: {
          likes: Math.floor(Math.random() * 100),
          dislikes: Math.floor(Math.random() * 10),
          users: []
        },
        views: Math.floor(Math.random() * 1000),
        status: 'published',
        createdAt: createdAt,
        updatedAt: createdAt,
        publishedAt: publishedAt,
        location: Math.random() > 0.7 ? generateRandomLocation() : null, // 30% постів мають геолокацію
        versions: [],
        metadata: {
          readingTime: readingTime,
          wordCount: wordCount,
          featured: Math.random() > 0.8 // 20% постів - рекомендовані
        }
      });
    }
    
    const postResult = await db.collection('posts').insertMany(postDocs);
    console.log(`✅ Створено ${postResult.insertedCount} постів`);
    
    // Підрахунок коментарів (включаючи вкладені)
    let totalComments = 0;
    postDocs.forEach(post => {
      totalComments += post.comments.length;
      post.comments.forEach(comment => {
        totalComments += comment.replies.length;
      });
    });
    console.log(`✅ Створено ${totalComments} коментарів (включаючи вкладені)`);
    
    // Оновлення postCount для категорій
    const categoryPostCounts = {};
    postDocs.forEach(post => {
      const catId = post.categoryId.toString();
      categoryPostCounts[catId] = (categoryPostCounts[catId] || 0) + 1;
    });
    
    for (const [catId, count] of Object.entries(categoryPostCounts)) {
      await db.collection('categories').updateOne(
        { _id: new ObjectId(catId) },
        { $set: { postCount: count } }
      );
    }
    
    console.log('✅ Оновлено кількість постів у категоріях');
    console.log('\n🎉 База даних успішно заповнена!');
    console.log(`📊 Статистика:`);
    console.log(`   - Користувачі: ${userIds.length}`);
    console.log(`   - Пости: ${postResult.insertedCount}`);
    console.log(`   - Коментарі: ${totalComments}`);
    console.log(`   - Категорії: ${categoryIds.length}`);
    
  } catch (error) {
    console.error('❌ Помилка заповнення бази даних:', error);
  } finally {
    await closeDatabase();
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };

