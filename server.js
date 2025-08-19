// importing express and sqlite3
const express = require('express');
const sqlite3 = require('sqlite3').verbose();

// getting an instance to be able to use express to communicate
const app = express();
app.use(express.json()); // automatically parses json when pulling in request
app.use(express.static('public')); // making sure that everything in public folder is initially loaded

// routing to different pages within web app

// loading the main page 
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
});

// routing to csvDownload page
app.get("/csvDownload", (req, res) => {
    res.sendFile(__dirname + "/public/csvDownload.html");
});

// now setting up the database to use
const db = new sqlite3.Database("database.db");

// now creating tables for database to hold
db.serialize(() => { // serialize is used to ensure that tables are created in proper order by db
    // first creating the categories table
    db.run("CREATE TABLE IF NOT EXISTS Categories (id INTEGER PRIMARY KEY, name TEXT UNIQUE)");

    // Adding the default categories
    db.run("INSERT OR IGNORE INTO Categories (name) VALUES (?), (?), (?), (?), (?), (?), (?), (?), (?)", 
        ["Housing", "Utilities", "Food", "Transportation", "Healthcare", 
        "Insurance", "Entertainment/Recreation", "Savings/Investments", "Miscellaneous"], 
        function(err) {
        if (err) {console.error(err.message); return;}
    });

    // now creating the transactions table
    db.run(`CREATE TABLE IF NOT EXISTS Transactions 
            (id INTEGER PRIMARY KEY,
            date TEXT,  
            merchant TEXT,
            amount REAL,
            category_id INTEGER,
            FOREIGN KEY (category_id) REFERENCES Categories (id))`);
});

// // deleting all categories from the database
// app.delete("/categories", (req, res) => {
//     // sql query to delete all rows
//     db.run("DELETE FROM Categories", function(err) {
//         if (err) {console.error(err.message); return;}
//         else {res.json({success : true});}
//     })
// });

// get all transactions from the database
app.get("/transactions", (req, res) => {
    // set up sql query to get all transactions
    db.all(`SELECT t.id, t.date, t.merchant, t.amount, c.name AS category_name
            FROM Transactions t
            JOIN Categories c
            ON t.category_id = c.id`, (err, rows) => {
        if (err) {
            console.error(err.message);
            return;
        }
        res.json(rows);
    });
});

// get all categories from the database
app.get("/categories", (req, res) => {
    // sql query to return all categories
    db.all("SELECT * FROM Categories", (err, rows) => {
        if (err) {
            console.error(err.message);
            return;
        }
        res.json(rows);
    })
})

// posting a transaction to the database
app.post("/transactions", (req, res) => {
    // first get data that was passed in from request
    var date = req.body.date;
    var merchant = req.body.merchant;
    var amount = req.body.amount;
    var category = req.body.category;

    // insert the category 
    db.run("INSERT OR IGNORE INTO Categories (name) VALUES (?)", [category], function(err) {
        if (err) {console.error(err.message); return;}

        // now get the category_id from category
        db.get("SELECT id FROM Categories WHERE name = ?", [category], (err, data) => {
            if (err) {console.error(err.message); return;}

            // now insert the transaction
            db.run("INSERT INTO Transactions (date, merchant, amount, category_id) VALUES (?, ?, ?, ?)", [date, merchant, amount, data.id], function(err){
                if (err) {console.error(err.message); return;}
                else { // sending response to client
                    // getting latest entry out of db to send back to client for table update
                    db.get(`SELECT t.id, t.date, t.merchant, t.amount, c.name AS category_name
                            FROM Transactions t
                            JOIN Categories c
                            ON t.category_id = c.id
                            ORDER BY t.id DESC LIMIT 1`, 
                            (err, row) => {
                            if (err) {console.error(err.message); return;}
                            else {
                                res.json(row);
                            }
                    });
                } 
            });
        });
    });
});

// deleting all transactions from the database
app.delete("/transactions", (req, res) => {
    // sql query to delete all rows
    db.run("DELETE FROM Transactions", function(err) {
        if (err) {console.error(err.message); return;}
        else {res.json({success : true});}
    })
});

// posting transactions in bulk
app.post("/transactions/bulk", (req, res) => {
    // get array of transactions
    const transactions = req.body;

    // get array of categories
    const categories = [...new Set(transactions.map(t => t.category))];

    // make sure to do everything in order (especially with multiple inserts)
    db.serialize(() => {
        // inserting categories
        const insertCategory = db.prepare("INSERT OR IGNORE INTO Categories (name) VALUES (?)");
        categories.forEach(category => insertCategory.run(category));
        insertCategory.finalize();

        // get all category ids
        db.all("SELECT id, name FROM Categories WHERE name IN (" + categories.map(() => "?").join(",") + ")", categories, (err, rows) => {
            if (err) {console.error(err.message); return;}

            // map category name to id
            const categoryMap = {};
            rows.forEach(r => categoryMap[r.name] = r.id);

            // Convert objects -> arrays [date, merchant, amount, category_id]
            const valuesArray = transactions.map(t => [t.date, t.merchant, t.amount, categoryMap[t.category]]);
            
            // getting placeholders and flattening 2d array
            let placeholders = valuesArray.map(() => "(?, ?, ?, ?)").join(", ");
            let flatValues = valuesArray.flat();

            // now sending the sql query
            db.run(`INSERT INTO Transactions (date, merchant, amount, category_id) VALUES ${placeholders}`, flatValues, function(err) {
                if (err) {console.error(err.message); return;} else {res.json({success : true});}
            });
        });
    });
});


app.listen(3000, () => console.log('Server running on http://localhost:3000'));