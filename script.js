function login(event){
    event.preventDefault();
    const username = document.getElementById("username");
    const password = document.getElementById("password");
    const errorMsg = document.getElementById("errorMessage");

    //clearing any old error message
    errorMsg.textContent = "";
    //for demo purposes we are using hard coded credentials
    if (username.value === "bob" && password.value === "bobpass"){
        alert("Login successful!");
        //redirect user to the dashboard page
        window.location.href = "dashboard.html";
    } else {
        //errorMsg.textContent = "Invalid username or password";
        document.getElementById("error").innerText = "Invalid credentials.";
    }
    // Clear input fields
    username.value = "";
    password.value = "";
}


