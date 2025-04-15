// Check if user is logged in when accessing dashboard
if (window.location.pathname.endsWith('dashboard.html')) {
    const loggedInUser = localStorage.getItem('loggedInUser');
    if (!loggedInUser) {
        window.location.href = 'login.html';
    }
}

// Login functionality
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorElement = document.getElementById('error');
        
        // Hardcoded credentials (bob / bobpass)
        if (username === 'bob' && password === 'bobpass') {
            localStorage.setItem('loggedInUser', username);
            window.location.href = 'dashboard.html';
        } else {
            errorElement.textContent = 'Invalid username or password';
        }
    });
}

// Logout functionality
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
        localStorage.removeItem('loggedInUser');
        window.location.href = 'login.html';
    });
}