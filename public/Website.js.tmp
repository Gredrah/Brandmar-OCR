const input = document.getElementById("receiptInput");
const preview = document.getElementById("preview");
const statusBox = document.getElementById("statusBox");
const resultBox = document.getElementById("result");

input.addEventListener("change", async function (event) {
    const file = event.target.files[0];

    if (!file) return;

    preview.src = URL.createObjectURL(file);

    statusBox.textContent = "Processing receipt...";

    try {
        const result = await uploadImage(file);

        statusBox.textContent = "Done";

        displayResult(result);

    } catch (err) {
        statusBox.textContent = "Failed";
        console.error(err);
    }
});

async function uploadImage(file) {
    const formData = new FormData();
    formData.append("receipts", file);
    const response = await fetch("/process", { 
        method: "POST",
        body: formData
    });
    if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText);
    }
    return await response.json();
}

function displayResult(data) {
    resultBox.innerHTML = "";

    if (data.error) {
        resultBox.textContent = "Error: " + data.error;
        return;
    }

    const summary = data.distributor_summary;
    if (summary) {
        const el = document.createElement("p");
        el.textContent = `Gross Sales: $${summary.gross_sales}`;
        resultBox.appendChild(el);
    }

    const profit = data.gross_profit;
    if (profit) {
        const el = document.createElement("p");
        el.textContent = `Gross Profit: $${profit.distributor_gross_profit}`;
        resultBox.appendChild(el);
    }

    const payments = data.payments_received;
    if (payments) {
        const el = document.createElement("p");
        el.textContent = `Cash: $${payments.total_cash}, Check: $${payments.total_check}`;
        resultBox.appendChild(el);
    }

    const meta = data.metadata;
    if (meta) {
        const el = document.createElement("p");
        el.textContent = `Dates Consistent: ${meta.dates_consistent}`;
        resultBox.appendChild(el);
    }
}