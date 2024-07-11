document.addEventListener("DOMContentLoaded", function() {
    // Handle login form submission
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", function(event) {
            event.preventDefault();
            
            const username = document.getElementById("username").value;
            const password = document.getElementById("password").value;

            fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    username: username,
                    password: password
                })
            })
            .then(response => {
                if (response.ok) {
                    window.location.href = '/homepage.html';
                } else {
                    response.text().then(text => alert(text));
                }
            })
            .catch(error => {
                console.error('Error during login:', error);
                alert('Login failed. Please try again.');
            });
        });
    }

    // Display logged-in username
    fetch('/get-username')
        .then(response => response.text())
        .then(data => {
            const usernameDisplay = document.getElementById('usernameDisplay');
            if (usernameDisplay) {
                usernameDisplay.innerText = `Logged in as: ${data}`;
            }
        })
        .catch(error => {
            console.error('Error fetching username:', error);
        });

    // Handle registration form submission
    const registerForm = document.getElementById("registerForm");
    if (registerForm) {
        registerForm.addEventListener("submit", function(event) {
            event.preventDefault();
            
            const username = document.getElementById("username").value;
            const password = document.getElementById("password").value;
            const fullname = document.getElementById("fullname").value;

            fetch('/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    username: username,
                    password: password,
                    fullname: fullname
                })
            })
            .then(response => {
                if (response.ok) {
                    document.getElementById("notification").style.display = 'block';
                } else {
                    response.text().then(text => alert(text));
                }
            })
            .catch(error => {
                console.error('Error during registration:', error);
                alert('Registration failed. Please try again.');
            });
        });

        document.getElementById("okButton").addEventListener("click", function() {
            window.location.href = 'index.html';
        });
    }

    // Fetch and display full name on homepage
    fetch('/get-userinfo')
        .then(response => response.text())
        .then(fullname => {
            const greeting = document.getElementById('greeting');
            if (greeting) {
                greeting.innerText = `Hi ${fullname}!`;
            }
        })
        .catch(error => {
            console.error('Error fetching user info:', error);
        });

    // Toggle the burger menu
    window.toggleMenu = function() {
        const burgerDropdown = document.getElementById('burgerDropdown');
        if (burgerDropdown.style.display === "block") {
            burgerDropdown.style.display = "none";
        } else {
            burgerDropdown.style.display = "block";
        }
    }

    // Handle stock in form submission
    const stockinForm = document.getElementById("stockinForm");
    if (stockinForm) {
        stockinForm.addEventListener("submit", function(event) {
            event.preventDefault();

            const formData = new FormData(stockinForm);
            const data = {};
            formData.forEach((value, key) => {
                data[key] = value;
            });

            fetch('/stockin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            })
            .then(response => {
                if (response.ok) {
                    alert('Stock in data submitted successfully.');
                    stockinForm.reset();
                } else {
                    response.text().then(text => alert(text));
                }
            })
            .catch(error => {
                console.error('Error during stock in submission:', error);
                alert('Submission failed. Please try again.');
            });
        });
    }

    // Handle stock out form submission
    const stockoutForm = document.getElementById('stockout-form');
    const summaryModal = document.getElementById('summaryModal');
    const summaryContent = document.getElementById('summaryContent');
    const confirmSubmit = document.getElementById('confirmSubmit');
    const messageElement = document.getElementById('message'); // Added message element

    if (stockoutForm) {
        stockoutForm.addEventListener('submit', function(event) {
            event.preventDefault(); // Prevent the default form submission

            const formData = new FormData(this);
            const formObject = Object.fromEntries(formData.entries());

            fetch('/stockout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formObject)
            })
            .then(response => response.text())
            .then(message => {
                // Show success message
                messageElement.textContent = 'Successful Transaction';
                messageElement.style.color = 'green'; // Success message color

                // Reset the form after a brief delay
                setTimeout(() => {
                    messageElement.textContent = '';
                    stockoutForm.reset();
                    summaryModal.style.display = 'none'; // Close summary modal
                }, 2000);
            })
            .catch(error => {
                console.error('Error:', error);
                messageElement.textContent = 'Submission failed. Please try again later.';
                messageElement.style.color = 'red'; // Error message color
            });
        });
    }

    // Fetch and display stock items on stocks.html
    if (window.location.pathname === '/stocks.html') {
        fetch('/get-stock-items')
            .then(response => response.json())
            .then(data => {
                const stockList = document.getElementById('stockList');
                data.forEach(item => {
                    const itemButton = document.createElement('button');
                    itemButton.textContent = item.item_name;
                    itemButton.onclick = () => toggleDetails(item.id);

                    const itemDetails = document.createElement('div');
                    itemDetails.id = `details-${item.id}`;
                    itemDetails.style.display = 'none';
                    itemDetails.innerHTML = `
                        Quantity: ${item.quantity}<br>
                        Unit of Measurement: ${item.unit_of_measurement}
                    `;

                    stockList.appendChild(itemButton);
                    stockList.appendChild(itemDetails);
                });
            })
            .catch(error => {
                console.error('Error fetching stock items:', error);
            });
    }

    // Function to toggle details visibility
    function toggleDetails(id) {
        const details = document.getElementById(`details-${id}`);
        if (details.style.display === 'none') {
            details.style.display = 'block';
        } else {
            details.style.display = 'none';
        }
    }

    // Show summary before submission
    window.showSummary = function() {
        const formData = new FormData(stockoutForm);
        let summaryHtml = '<ul>';
        formData.forEach((value, key) => {
            summaryHtml += `<li><strong>${key}:</strong> ${value}</li>`;
        });
        summaryHtml += '</ul>';

        summaryContent.innerHTML = summaryHtml;
        summaryModal.style.display = 'block';
    }

    // Close summary modal
    window.closeSummary = function() {
        summaryModal.style.display = 'none';
    }

    // Confirm submission from summary
    confirmSubmit.addEventListener('click', function() {
        // Submit the form programmatically
        const submitEvent = new Event('submit');
        stockoutForm.dispatchEvent(submitEvent);

        // Show success message before closing modal
        setTimeout(() => {
            alert('Successful Transaction');
            closeSummary();
        }, 1000); // Adjust timing as needed
    });

    // Close the modal when the "x" button is clicked
    document.querySelector('.close').addEventListener('click', closeSummary);

    
});

// Populate history table function
function populateHistoryTable() {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "/history", true);
    xhr.onload = function() {
        if (xhr.status === 200) {
            var historyData = JSON.parse(xhr.responseText);
            var tableBody = document.getElementById("historyTable").getElementsByTagName("tbody")[0];
            tableBody.innerHTML = "";
            for (var i = 0; i < historyData.length; i++) {
                var row = tableBody.insertRow();
                row.innerHTML = `
                    <td>${historyData[i].transaction_type}</td>
                    <td>${historyData[i].name}</td>
                    <td>${historyData[i].address}</td>
                    <td>${historyData[i].contact_number}</td>
                    <td>${historyData[i].company_name}</td>
                    <td>${historyData[i].item_name}</td>
                    <td>${historyData[i].quantity}</td>
                    <td>${historyData[i].unit_of_measurement}</td>
                    <td>${historyData[i].date}</td>
                    <td>${historyData[i].timestamp}</td>
                `;
            }
        }
    };
    xhr.send();
}

// Call populate history table function on page load
window.onload = populateHistoryTable;


