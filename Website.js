const input = document.getElementById("receiptInput");
const preview = document.getElementById("preview");

input.addEventListener("change", async function(event) {
    const file = event.target.files;

    if (file) {
        preview.src = URL.createObjectURL(file);
    }
});