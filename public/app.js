// first getting variables to hold the form and table components
const form = document.getElementById('transactionForm');
const tableBody = document.querySelector('#transactionsTable tbody');
const removeButton = document.getElementById('removeButton');
const categorySelector = document.getElementById('categorySelector');

// gets all of the categories and populates drop-down menu
function getCategories() {
    fetch("/categories")
    .then(response => {
        if (!response.ok) { // check if response was good
            throw new Error ("Server response had an error.");
        } return response.json();
    }).then(data => {
        // data now contains the array full of category objects
        // console.log("Categories:");
        // console.log(data);

        // clear selector
        categorySelector.innerHTML = "";

        // add placeholder
        const placeholderOption = document.createElement("option");
        placeholderOption.value = "";
        placeholderOption.textContent = "Select a category";
        placeholderOption.disabled = true;
        placeholderOption.selected = true;
        categorySelector.appendChild(placeholderOption);

        // add array values as options for select
        data.forEach(element => {
            const option = document.createElement("option");
            option.value = element.name;     // value sent in form submission
            option.textContent = element.name; // text shown in dropdown
            categorySelector.appendChild(option);
        });
    });
}

// gets all of the table data and displays transactions
function getTransactions() {
    fetch("/transactions")
    .then(response => {
        if (!response.ok) { // check if response was good
            throw new Error ("Server response had an error.");
        } return response.json();
    }).then(data => {
        // data now contains the array full of transaction objects
        // console.log("Transactions:");
        // console.log(data);

        // remove any data from table from past requests
        tableBody.innerHTML = "";

        // now for each item in array, add as row to table
        for (let i=0; i<data.length; i++) {
            const newRow = tableBody.insertRow();

            // putting data into the table
            const idCell = newRow.insertCell(0);
            idCell.textContent = data[i].id;
            const dateCell = newRow.insertCell(1);
            dateCell.textContent = data[i].date;
            const descriptionCell = newRow.insertCell(2);
            descriptionCell.textContent = data[i].description;
            const amountCell = newRow.insertCell(3);
            amountCell.textContent = data[i].amount;
            const categoryCell = newRow.insertCell(4);
            categoryCell.textContent = data[i].category_name;
        }
    });
}

// listening to form to tell when submit occurs
form.addEventListener("submit", (e) => {
    e.preventDefault(); // prevent page reload when form submitted

    // now need to get the data out of the form
    var transaction = {
        date: document.getElementById('date').value,
        description: document.getElementById('description').value,
        amount: parseFloat(document.getElementById('amount').value),
        category: document.getElementById('categorySelector').value
    };

    // now need to send this new transaction to the server
    fetch("/transactions", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction)
    }).then(response => {
        if (!response.ok) { // check if response was good
            throw new Error ("Server response had an error.");
        } return response.json();
    }).then(data => {
        // add new row to the html table
        const newRow = tableBody.insertRow();

        // putting data into the table
        const idCell = newRow.insertCell(0);
        idCell.textContent = data.id;
        const dateCell = newRow.insertCell(1);
        dateCell.textContent = data.date;
        const descriptionCell = newRow.insertCell(2);
        descriptionCell.textContent = data.description;
        const amountCell = newRow.insertCell(3);
        amountCell.textContent = data.amount;
        const categoryCell = newRow.insertCell(4);
        categoryCell.textContent = data.category_name;
    });
});

// listening to remove button
removeButton.addEventListener("click", () => {
    fetch("/transactions", {
        method: "DELETE"
    }).then(response => {
        if (!response.ok) { // check if response was good
            throw new Error ("Error deleting transaction data.");
        } return response.json();
    }).then(() => getTransactions());
});

// This should run immediately when the webpage is initially loaded up
getCategories();
getTransactions();