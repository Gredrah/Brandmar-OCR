const input = document.getElementById("receiptInput");
const preview = document.getElementById("preview");
const status = document.getElementById("status");

input.addEventListener("change", async function (event) {
    const file = event.target.files[0];

    if (!file) return;

    // 🖼️ show preview
    preview.src = URL.createObjectURL(file);

    status.textContent = "Uploading...";

    try {
        const result = await uploadImage(file);

        status.textContent = "Done";
        console.log(result);

    } catch (err) {
        status.textContent = "Failed";
        console.error(err);
    }
});
