document.getElementById("uploadForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fileInput = document.getElementById("fileInput");
  const Message = document.getElementById("message");
  const file = fileInput.files[0];
  if (!file) {
    Message.textContent = "No file selected";
    return;
  }
  const formData = new FormData();
  formData.append("file", file);
  try {
    const response = await fetch("/upload", {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      const result = await response.json();
      Message.textContent = result.message;
      return;
    }
    const result = await response.json();
    document.getElementById("result").classList.remove("hidden");
    document.getElementById("fileLink").textContent = result.link;
    document.getElementById("copyButton").textContent = "Copy Link";
  } catch (error) {
    Message.textContent = "Error uploading file: " + error.message;
  }
});
async function downloadFile() {
  const Message = document.getElementById("message");
  const fileInput = document.getElementById("urlInput");
  const FileName = document.getElementById("FileName");
  try {
    const response = await fetch(fileInput.value);
    const result = await response.json();
    if (!response.ok) {
      Message.textContent = result.message;
    }
    const a = document.createElement("a");
    a.href = result.File;
    a.download = FileName.value;
    a.click();
  } catch (error) {
    console.log({ error });
  }
}
function CopyToClipboard() {
  const fileLink = document.getElementById("fileLink");
  if (!fileLink) {
    console.error("Element with id 'fileLink' not found.");
    return;
  }
  navigator.clipboard
    .writeText(fileLink.value)
    .then(() => {
      console.log("Copied to clipboard!");
    })
    .catch((err) => {
      console.error("Failed to copy: ", err);
    });
}
const { protocol, host } = window.location;
async function onChange(event) {
  const file = event.target.files[0];
  const fileData = document.getElementById("fileData");
  fileData.innerHTML = "";
  fileData.style.display = "block";
  fileData.appendChild(document.createTextNode(file.name));
  fileData.appendChild(document.createElement("br"));
  document.getElementById("submit-btn").style.display = "block";
  document.getElementById("link-container").style.display = "none";
  document.getElementById("link").value = "";
  document.getElementById("success").style.display = "none";
  document.getElementById("success").innerHTML = "";
}
async function submitForm(event) {
  event.preventDefault();
  var formData = new FormData(document.forms[0]);
  try {
    const progressElem = document.getElementById("progress");
    const response = await axios.post("/upload", formData, {
      onUploadProgress: function (progressEvent) {
        const loaded = progressEvent.loaded;
        const total = progressEvent.total;
        if (total) {
          const percentCompleted = Math.round((loaded * 100) / total);
          progressElem.innerHTML = `Uploading: ${percentCompleted}%`;
        }
      },
    });
    const { original_name, message, link } = response.data;
    const fileData = document.getElementById("fileData");
    fileData.innerHTML = "";
    fileData.style.display = "none";
    progressElem.innerHTML = "Drag and Drop / Choose File";
    document.getElementById("submit-btn").style.display = "none";
    const success = document.getElementById("success");
    success.innerHTML = "";
    success.style.display = "block";
    success.appendChild(document.createTextNode(message));
    success.appendChild(document.createElement("br"));
    success.appendChild(document.createTextNode(original_name));
    success.appendChild(document.createElement("br"));
    document.getElementById("link").value = "";
    document.getElementById("file").value = "";
    document.getElementById("container").style.display = "flex";
    document.getElementById("link-container").style.display = "flex";
    document.getElementById("link").value = link;
  } catch (error) {
    console.log({ error });
    const errorDiv = document.getElementById("error");
    errorDiv.innerHTML = "";
    errorDiv.style.display = "block";
    if (error.response) {
      const errorResponse = error.response.data;
      errorDiv.appendChild(document.createTextNode(errorResponse.message));
    } else if (error.request) {
      errorDiv.appendChild(document.createTextNode("No response received"));
    } else {
      errorDiv.appendChild(document.createTextNode(error.message));
    }
  }
}
const container = document.getElementById("container");
function onDragOver(event) {
  event.preventDefault();
  document.body.classList.add("dragover");
}

// Function to handle dragleave event on the entire window
function onDragLeave(event) {
  event.preventDefault();
  document.body.classList.remove("dragover");
}

// Function to handle drop event on the entire window
function onDrop(event) {
  event.preventDefault();
  document.body.classList.remove("dragover");
  const files = event.dataTransfer.files;
  if (files.length > 0) {
    const fileInput = document.getElementById("file");
    fileInput.files = files;
    const changeEvent = new Event("change");
    fileInput.dispatchEvent(changeEvent);
  }
}
if (container) {
  document.body.addEventListener("dragover", onDragOver);
  document.body.addEventListener("dragleave", onDragLeave);
  document.body.addEventListener("drop", onDrop);
}
function copyToClipboard() {
  var copyText = document.getElementById("link");
  copyText.select();
  copyText.setSelectionRange(0, 99999);
  document.execCommand("copy");
  notify("Copied: " + copyText.value);
}
function notify(message) {
  const div = document.getElementById("message");
  div.innerHTML = "";
  div.style.display = "flex";
  div.innerHTML = message;
  setTimeout(() => {
    div.style.display = "none";
  }, 2000);
}

const handleDownload = () => {
  const progressElem = document.getElementById("download-btn");
  progressElem.disabled = true;
  progressElem.style.cursor = "not-allowed";
  axios({
    url: serverUrl,
    method: "POST",
    responseType: "blob",
    onDownloadProgress: (progressEvent) => {
      const percentCompleted = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      );
      progressElem.innerHTML = `Downloading: ${percentCompleted}%`;
    },
  })
    .then((response) => {
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `<?php echo $row['original_name']; ?>`);
      document.body.appendChild(link);
      link.click();
      progressElem.innerHTML = "Download";
      progressElem.disabled = false;
      progressElem.style.cursor = "pointer";
      document.body.removeChild(link);
      document.getElementById("fileData-slug").innerHTML =
        "your download finished";
    })
    .catch((error) => {
      progressElem.innerHTML = "Download failed";
    });
};
