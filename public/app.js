const API_BASE = '/api';
let currentPage = 1;
let currentLimit = 10;
let currentSortBy = 'publishedAt';

// Ініціалізація
document.addEventListener('DOMContentLoaded', async () => {
    await loadCategories();
    await loadUsers();
    await loadStats();
    await loadPosts();
    setupEventListeners();
});

// Завантаження категорій
async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE}/categories`);
        const categories = await response.json();
        
        const categoryFilter = document.getElementById('category-filter');
        const postCategory = document.getElementById('post-category');
        
        categories.forEach(cat => {
            const option1 = document.createElement('option');
            option1.value = cat._id;
            option1.textContent = cat.name;
            categoryFilter.appendChild(option1);
            
            const option2 = document.createElement('option');
            option2.value = cat._id;
            option2.textContent = cat.name;
            postCategory.appendChild(option2);
        });
    } catch (error) {
        console.error('Помилка завантаження категорій:', error);
    }
}

// Завантаження користувачів
async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE}/users`);
        const users = await response.json();
        const authors = users.filter(u => u.role === 'author' || u.role === 'admin');
        
        const postAuthor = document.getElementById('post-author');
        authors.forEach(user => {
            const option = document.createElement('option');
            option.value = user._id;
            option.textContent = `${user.profile.firstName} ${user.profile.lastName} (${user.username})`;
            postAuthor.appendChild(option);
        });
    } catch (error) {
        console.error('Помилка завантаження користувачів:', error);
    }
}

// Завантаження статистики
async function loadStats() {
    try {
        const [topAuthors, popularCategories, commentStats] = await Promise.all([
            fetch(`${API_BASE}/authors/top?limit=5`).then(r => r.json()),
            fetch(`${API_BASE}/categories/popular?limit=5`).then(r => r.json()),
            fetch(`${API_BASE}/statistics/comments`).then(r => r.json())
        ]);
        
        displayTopAuthors(topAuthors);
        displayPopularCategories(popularCategories);
        displayCommentStats(commentStats);
    } catch (error) {
        console.error('Помилка завантаження статистики:', error);
    }
}

function displayTopAuthors(authors) {
    const container = document.getElementById('top-authors');
    container.innerHTML = authors.map((author, index) => `
        <div style="padding: 0.5rem 0; border-bottom: 1px solid #eee;">
            <strong>${index + 1}. ${author.authorName}</strong><br>
            <small>Постів: ${author.postCount} | Переглядів: ${author.totalViews} | Лайків: ${author.totalLikes}</small>
        </div>
    `).join('');
}

function displayPopularCategories(categories) {
    const container = document.getElementById('popular-categories');
    container.innerHTML = categories.map((cat, index) => `
        <div style="padding: 0.5rem 0; border-bottom: 1px solid #eee;">
            <strong>${index + 1}. ${cat.categoryName}</strong><br>
            <small>Постів: ${cat.postCount} | Коментарів: ${cat.totalComments}</small>
        </div>
    `).join('');
}

function displayCommentStats(stats) {
    const container = document.getElementById('comment-stats');
    container.innerHTML = `
        <div style="padding: 0.5rem 0;">
            <strong>Всього коментарів:</strong> ${stats.totalComments || 0}<br>
            <strong>Середня кількість на пост:</strong> ${stats.averageCommentsPerPost || 0}<br>
            <strong>Максимум:</strong> ${stats.maxComments || 0}<br>
            <strong>Мінімум:</strong> ${stats.minComments || 0}
        </div>
    `;
}

// Завантаження постів
async function loadPosts() {
    try {
        const categoryId = document.getElementById('category-filter').value;
        const sortBy = document.getElementById('sort-by').value;
        currentSortBy = sortBy;
        
        const params = new URLSearchParams({
            page: currentPage,
            limit: currentLimit,
            sortBy: sortBy,
            sortOrder: -1
        });
        
        if (categoryId) params.append('categoryId', categoryId);
        
        const response = await fetch(`${API_BASE}/posts?${params}`);
        const data = await response.json();
        
        displayPosts(data.posts);
        displayPagination(data.pagination);
    } catch (error) {
        console.error('Помилка завантаження постів:', error);
    }
}

function displayPosts(posts) {
    const container = document.getElementById('posts-container');
    
    if (posts.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 2rem;">Пости не знайдено</p>';
        return;
    }
    
    container.innerHTML = posts.map(post => `
        <div class="post-card" onclick="showPostDetails('${post._id}')">
            <div class="post-header">
                <div>
                    <h3 class="post-title">${post.title}</h3>
                    <div class="post-meta">
                        <span>👤 ${post.authorName || 'Невідомий автор'}</span>
                        <span>📁 ${post.categoryName || 'Без категорії'}</span>
                        <span>📅 ${new Date(post.publishedAt).toLocaleDateString('uk-UA')}</span>
                        <span>👁️ ${post.views || 0} переглядів</span>
                        <span>💬 ${post.comments || 0} коментарів</span>
                    </div>
                </div>
            </div>
            <div class="post-content-preview">${post.content}...</div>
            <div class="post-tags">
                ${(post.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
            <div class="post-footer">
                <div class="rating-buttons">
                    <button class="rating-btn like-btn" onclick="event.stopPropagation(); ratePost('${post._id}', 'like')">
                        👍 ${post.rating?.likes || 0}
                    </button>
                    <button class="rating-btn dislike-btn" onclick="event.stopPropagation(); ratePost('${post._id}', 'dislike')">
                        👎 ${post.rating?.dislikes || 0}
                    </button>
                </div>
                <div>
                    <small>⏱️ ${post.metadata?.readingTime || 0} хв читання</small>
                </div>
            </div>
        </div>
    `).join('');
}

function displayPagination(pagination) {
    const container = document.getElementById('pagination');
    
    if (!pagination || pagination.pages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '';
    
    if (pagination.page > 1) {
        html += `<button class="pagination-btn" onclick="changePage(${pagination.page - 1})">‹ Попередня</button>`;
    }
    
    for (let i = 1; i <= pagination.pages; i++) {
        if (i === 1 || i === pagination.pages || (i >= pagination.page - 2 && i <= pagination.page + 2)) {
            html += `<button class="pagination-btn ${i === pagination.page ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
        } else if (i === pagination.page - 3 || i === pagination.page + 3) {
            html += `<span>...</span>`;
        }
    }
    
    if (pagination.page < pagination.pages) {
        html += `<button class="pagination-btn" onclick="changePage(${pagination.page + 1})">Наступна ›</button>`;
    }
    
    container.innerHTML = html;
}

function changePage(page) {
    currentPage = page;
    loadPosts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Деталі поста
async function showPostDetails(postId) {
    try {
        const response = await fetch(`${API_BASE}/posts/${postId}`);
        const post = await response.json();
        
        const modal = document.getElementById('post-modal');
        const details = document.getElementById('post-details');
        
        details.innerHTML = `
            <h2>${post.title}</h2>
            <div class="post-meta" style="margin: 1rem 0;">
                <span>👤 ${post.authorName || 'Невідомий автор'}</span>
                <span>📁 ${post.categoryName || 'Без категорії'}</span>
                <span>📅 ${new Date(post.publishedAt).toLocaleDateString('uk-UA')}</span>
                <span>👁️ ${post.views || 0} переглядів</span>
            </div>
            <div class="post-tags" style="margin: 1rem 0;">
                ${(post.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
            <div class="post-content" style="margin: 2rem 0; line-height: 1.8;">
                ${post.content.split('\n').map(p => `<p>${p}</p>`).join('')}
            </div>
            <div class="rating-buttons" style="margin: 1rem 0;">
                <button class="rating-btn like-btn" onclick="ratePost('${postId}', 'like')">
                    👍 ${post.rating?.likes || 0}
                </button>
                <button class="rating-btn dislike-btn" onclick="ratePost('${postId}', 'dislike')">
                    👎 ${post.rating?.dislikes || 0}
                </button>
            </div>
            <h3 style="margin-top: 2rem;">Коментарі (${post.comments?.length || 0})</h3>
            <div id="comments-list">
                ${displayComments(post.comments || [])}
            </div>
            <div style="margin-top: 2rem;">
                <h4>Додати коментар</h4>
                <textarea id="new-comment" rows="3" style="width: 100%; padding: 0.7rem; margin: 0.5rem 0;"></textarea>
                <button onclick="addComment('${postId}')" style="padding: 0.7rem 1.5rem; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Додати коментар
                </button>
            </div>
        `;
        
        modal.style.display = 'block';
    } catch (error) {
        console.error('Помилка завантаження деталей поста:', error);
        alert('Помилка завантаження поста');
    }
}

function displayComments(comments) {
    if (!comments || comments.length === 0) {
        return '<p>Коментарів поки немає</p>';
    }
    
    return comments.map(comment => {
        let html = `
            <div class="comment ${comment.status !== 'approved' ? 'comment-pending' : ''}">
                <div>
                    <strong>Коментар #${comment._id.toString().substring(0, 8)}</strong>
                    <span class="comment-status status-${comment.status}">${comment.status}</span>
                </div>
                <p>${comment.content}</p>
                <small>${new Date(comment.createdAt).toLocaleDateString('uk-UA')} | 👍 ${comment.likes || 0} | 👎 ${comment.dislikes || 0}</small>
            </div>
        `;
        
        if (comment.replies && comment.replies.length > 0) {
            html += comment.replies.map(reply => `
                <div class="comment comment-reply">
                    <p>${reply.content}</p>
                    <small>${new Date(reply.createdAt).toLocaleDateString('uk-UA')}</small>
                </div>
            `).join('');
        }
        
        return html;
    }).join('');
}

// Оцінка поста
async function ratePost(postId, type) {
    try {
        // В реальному застосунку тут буде ID поточного користувача
        const userId = prompt('Введіть ID користувача (для тестування):');
        if (!userId) return;
        
        const response = await fetch(`${API_BASE}/posts/${postId}/rating`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, type })
        });
        
        const result = await response.json();
        alert(result.message);
        
        // Оновити відображення
        if (document.getElementById('post-modal').style.display === 'block') {
            showPostDetails(postId);
        } else {
            loadPosts();
        }
    } catch (error) {
        console.error('Помилка оцінки поста:', error);
        alert('Помилка оцінки поста');
    }
}

// Додати коментар
async function addComment(postId) {
    try {
        const content = document.getElementById('new-comment').value;
        if (!content.trim()) {
            alert('Введіть текст коментаря');
            return;
        }
        
        const userId = prompt('Введіть ID користувача (для тестування):');
        if (!userId) return;
        
        const response = await fetch(`${API_BASE}/posts/${postId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, content })
        });
        
        const result = await response.json();
        alert('Коментар додано! Він очікує модерації.');
        document.getElementById('new-comment').value = '';
        showPostDetails(postId);
    } catch (error) {
        console.error('Помилка додавання коментаря:', error);
        alert('Помилка додавання коментаря');
    }
}

// Повнотекстовий пошук
async function performTextSearch() {
    const searchText = document.getElementById('text-search').value;
    if (!searchText.trim()) {
        alert('Введіть пошуковий запит');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/posts/search/text?q=${encodeURIComponent(searchText)}&page=1&limit=10`);
        const data = await response.json();
        displayPosts(data.posts);
        displayPagination(data.pagination);
    } catch (error) {
        console.error('Помилка пошуку:', error);
        alert('Помилка пошуку');
    }
}

// Пошук за тегами
async function performTagSearch() {
    const tags = document.getElementById('tags-search').value;
    if (!tags.trim()) {
        alert('Введіть теги');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/posts/search/tags?tags=${encodeURIComponent(tags)}&page=1&limit=10`);
        const data = await response.json();
        displayPosts(data.posts);
        displayPagination(data.pagination);
    } catch (error) {
        console.error('Помилка пошуку за тегами:', error);
        alert('Помилка пошуку за тегами');
    }
}

// Додати пост
document.getElementById('add-post-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const title = document.getElementById('post-title').value;
    const content = document.getElementById('post-content').value;
    const categoryId = document.getElementById('post-category').value;
    const authorId = document.getElementById('post-author').value;
    const tags = document.getElementById('post-tags').value.split(',').map(t => t.trim()).filter(t => t);
    const lng = document.getElementById('post-lng').value;
    const lat = document.getElementById('post-lat').value;
    
    const postData = {
        title,
        content,
        categoryId,
        authorId,
        tags
    };
    
    if (lng && lat) {
        postData.location = {
            longitude: parseFloat(lng),
            latitude: parseFloat(lat)
        };
    }
    
    try {
        const response = await fetch(`${API_BASE}/posts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(postData)
        });
        
        const result = await response.json();
        if (response.ok) {
            alert('Пост успішно створено!');
            document.getElementById('add-post-form').reset();
            loadPosts();
            loadStats();
        } else {
            alert('Помилка: ' + result.error);
        }
    } catch (error) {
        console.error('Помилка створення поста:', error);
        alert('Помилка створення поста');
    }
});

// Налаштування обробників подій
function setupEventListeners() {
    // Закриття модального вікна
    document.querySelector('.close').addEventListener('click', () => {
        document.getElementById('post-modal').style.display = 'none';
    });
    
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('post-modal');
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Фільтри
    document.getElementById('category-filter').addEventListener('change', () => {
        currentPage = 1;
        loadPosts();
    });
    
    document.getElementById('sort-by').addEventListener('change', () => {
        currentPage = 1;
        loadPosts();
    });
    
    // Enter для пошуку
    document.getElementById('text-search').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performTextSearch();
    });
    
    document.getElementById('tags-search').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performTagSearch();
    });
}

// Завантаження аналітики
async function loadAnalytics() {
    try {
        const response = await fetch(`${API_BASE}/analytics`);
        const analytics = await response.json();
        
        const container = document.getElementById('analytics-content');
        container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <h3>Статистика переглядів</h3>
                    <p>Всього: ${analytics.viewStats.totalViews}</p>
                    <p>Середнє: ${analytics.viewStats.averageViews}</p>
                    <p>Максимум: ${analytics.viewStats.maxViews}</p>
                </div>
                <div class="stat-card">
                    <h3>Пости за статусом</h3>
                    ${analytics.postsByStatus.map(s => `<p>${s._id}: ${s.count}</p>`).join('')}
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Помилка завантаження аналітики:', error);
    }
}

// Завантажити аналітику при кліку на вкладку
document.querySelector('nav a[href="#analytics"]').addEventListener('click', (e) => {
    e.preventDefault();
    loadAnalytics();
    document.getElementById('analytics').scrollIntoView({ behavior: 'smooth' });
});

