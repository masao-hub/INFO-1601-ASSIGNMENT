const email = document.getElementById('email').value;
const password = document.getElementById('password').value;

firebase.signInWithEmailAndPassword(firebase.auth, email, password)
  .then(user => {
    console.log("Logged in", user.user.uid);
    localStorage.setItem("userId", user.user.uid);
    window.location.href = "index.html";
  })
  .catch(err => {
    alert("Login failed: " + err.message);
  });
