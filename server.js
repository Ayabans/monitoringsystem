const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const session = require('express-session');

const app = express();
const port = 3000;

// Middleware setup
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true
}));

// SQLite database connection
let db = new sqlite3.Database('./database.db', sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the database.');
});

// Create tables
const createStockInTable = `
CREATE TABLE IF NOT EXISTS stock_in (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_name TEXT NOT NULL,
    address TEXT NOT NULL,
    contact_number TEXT NOT NULL,
    company_name TEXT NOT NULL,
    item_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_of_measurement TEXT NOT NULL,
    date TEXT NOT NULL,
    timestamp TEXT NOT NULL
);
`;

const createItemListTable = `
CREATE TABLE IF NOT EXISTS item_list (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stock_in_id INTEGER NOT NULL,
    item_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_of_measurement TEXT NOT NULL,
    FOREIGN KEY(stock_in_id) REFERENCES stock_in(id)
);
`;

db.run(createStockInTable, (err) => {
    if (err) {
        console.error('Error creating stock_in table:', err);
    } else {
        console.log('stock_in table created successfully.');
    }
});

db.run(createItemListTable, (err) => {
    if (err) {
        console.error('Error creating item_list table:', err);
    } else {
        console.log('item_list table created successfully.');
    }
});

// Create history table
const createHistoryTable = `
CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_type TEXT NOT NULL,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    contact_number TEXT NOT NULL,
    company_name TEXT NOT NULL,
    item_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_of_measurement TEXT NOT NULL,
    date TEXT NOT NULL,
    timestamp TEXT NOT NULL
);
`;

db.run(createHistoryTable, (err) => {
    if (err) {
        console.error('Error creating history table:', err);
    } else {
        console.log('History table created successfully.');
    }
});

// Registration endpoint
app.post('/register', (req, res) => {
    const { username, password, fullname } = req.body;

    const checkUsernameSql = `SELECT * FROM users WHERE username = ?`;
    db.get(checkUsernameSql, [username], (err, row) => {
        if (err) {
            console.error('Error checking username:', err);
            return res.status(500).send('Registration failed. Please try again later.');
        }
        if (row) {
            return res.status(400).send('Username already in use. Please use a different username.');
        }

        bcrypt.hash(password, 10, (err, hashedPassword) => {
            if (err) {
                console.error('Error hashing password:', err);
                return res.status(500).send('Error hashing password.');
            }

            const sql = `INSERT INTO users (username, password, fullname) VALUES (?, ?, ?)`;
            db.run(sql, [username, hashedPassword, fullname], function(err) {
                if (err) {
                    console.error('Error registering user:', err);
                    return res.status(500).send('Registration failed. Please try again later.');
                }
                console.log(`User ${username} registered successfully with id ${this.lastID}`);
                res.status(200).send('Registration successful.');
            });
        });
    });
});

// Login endpoint
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    const sql = `SELECT * FROM users WHERE username = ?`;
    db.get(sql, [username], (err, row) => {
        if (err) {
            return console.error(err.message);
        }
        if (!row) {
            return res.status(401).send('Invalid username or password.');
        }

        bcrypt.compare(password, row.password, (bcryptErr, result) => {
            if (bcryptErr || !result) {
                return res.status(401).send('Invalid username or password.');
            }

            req.session.username = row.username;
            res.redirect('/homepage.html');
        });
    });
});

// Serve homepage.html
app.get('/homepage.html', (req, res) => {
    if (req.session.username) {
        res.sendFile(__dirname + '/public/homepage.html');
    } else {
        res.redirect('/index.html');
    }
});

// API endpoint to get logged-in user's full name
app.get('/get-userinfo', (req, res) => {
    if (req.session.username) {
        const sql = `SELECT fullname FROM users WHERE username = ?`;
        db.get(sql, [req.session.username], (err, row) => {
            if (err) {
                console.error('Error retrieving user info:', err);
                return res.status(500).send('Error retrieving user info.');
            }
            if (row) {
                res.send(row.fullname);
            } else {
                res.status(404).send('User not found.');
            }
        });
    } else {
        res.status(401).send('Not logged in.');
    }
});

// Logout endpoint
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Logout failed. Please try again.');
        }
        res.redirect('/index.html');
    });
});

// Handle stock in form submission
app.post('/stockin', (req, res) => {
    const { supplierName, address, contactNumber, companyName, itemName, quantity, unitOfMeasurement, date, timestamp } = req.body;

    const sql = `
        SELECT * FROM stock_in
        WHERE item_name = ? AND company_name = ?
    `;

    db.get(sql, [itemName, companyName], (err, row) => {
        if (err) {
            console.error('Error checking for existing item:', err);
            return res.status(500).send('Submission failed. Please try again later.');
        }

        if (row) {
            // Update existing record
            const updateSql = `
                UPDATE stock_in
                SET quantity = quantity + ?
                WHERE id = ?
            `;
            db.run(updateSql, [quantity, row.id], function(err) {
                if (err) {
                    console.error('Error updating existing item:', err);
                    return res.status(500).send('Submission failed. Please try again later.');
                }
                console.log(`Quantity updated successfully for item ${itemName} with id ${row.id}`);
                res.status(200).send('Submission successful.');
            });
        } else {
            // Insert new record
            const insertSql = `
                INSERT INTO stock_in (supplier_name, address, contact_number, company_name, item_name, quantity, unit_of_measurement, date, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            db.run(insertSql, [supplierName, address, contactNumber, companyName, itemName, quantity, unitOfMeasurement, date, timestamp], function(err) {
                if (err) {
                    console.error('Error inserting new item:', err);
                    return res.status(500).send('Submission failed. Please try again later.');
                }
                console.log(`New item ${itemName} inserted successfully with id ${this.lastID}`);
                res.status(200).send('Submission successful.');
            });
        }
    });
});

// Fetch stock items
app.get('/get-stock-items', (req, res) => {
    const sql = `SELECT id, item_name, quantity, unit_of_measurement FROM stock_in`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Error fetching stock items:', err);
            return res.status(500).send('Error fetching stock items.');
        }
        res.json(rows);
    });
});

// Handle stock out form submission
app.post('/stockout', (req, res) => {
    const { customerName, address, contactNumber, itemName, companyName, quantity, unitOfMeasurement, date, timestamp } = req.body;

    const sql = `
        SELECT * FROM stock_in
        WHERE item_name = ? AND company_name = ?
    `;

    db.get(sql, [itemName, companyName], (err, row) => {
        if (err) {
            console.error('Error checking for existing item:', err);
            return res.status(500).send('Submission failed. Please try again later.');
        }

        if (row) {
            if (row.quantity < quantity) {
                return res.status(400).send('Not enough stock available.');
            }

            // Update existing record
            const updateSql = `
                UPDATE stock_in
                SET quantity = quantity - ?
                WHERE id = ?
            `;
            db.run(updateSql, [quantity, row.id], function(err) {
                if (err) {
                    console.error('Error updating existing item:', err);
                    return res.status(500).send('Submission failed. Please try again later.');
                }
                console.log(`Quantity updated successfully for item ${itemName} with id ${row.id}`);

                // Insert into stock_out table
                const insertStockOutSql = `
                    INSERT INTO stock_out (customer_name, address, contact_number, item_name, company_name, quantity, unit_of_measurement, date, timestamp)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;
                db.run(insertStockOutSql, [customerName, address, contactNumber, itemName, companyName, quantity, unitOfMeasurement, date, timestamp], function(err) {
                    if (err) {
                        console.error('Error inserting into stock_out:', err);
                        return res.status(500).send('Submission failed. Please try again later.');
                    }
                    console.log(`Stock out data inserted successfully with id ${this.lastID}`);
                    res.status(200).send('Submission successful.');
                });
            });
        } else {
            return res.status(400).send('Item not found in stock.');
        }
    });
});

// API endpoint to fetch history data
app.get('/history', (req, res) => {
    const sql = `SELECT * FROM history`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Error fetching history data:', err);
            return res.status(500).send('Error fetching history data.');
        }
        res.json(rows);
    });
});

// Start server
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
