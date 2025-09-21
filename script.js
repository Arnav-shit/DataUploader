import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, addDoc, collection, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";

// Set Firebase debug logs
setLogLevel('debug');

let db, auth;
let userId;

const urlParams = new URLSearchParams(window.location.search);
const appIdFromUrl = urlParams.get('appId');
const authTokenFromUrl = urlParams.get('authToken');

const imageUploadInput = document.getElementById('image-upload');
const imagePreviewContainer = document.getElementById('image-preview-container');
const imagePreview = document.getElementById('image-preview');
const sensorDataTextarea = document.getElementById('sensor-data');
const uploadForm = document.getElementById('upload-form');
const statusMessage = document.getElementById('status-message');
const userIdSpan = document.getElementById('user-id');

// Initialize Firebase on page load
window.addEventListener('load', async () => {
    const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
    if (Object.keys(firebaseConfig).length === 0) {
        statusMessage.textContent = 'Firebase config not found.';
        statusMessage.className = 'mt-6 text-red-500 font-bold';
        return;
    }

    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);

    // Listen for auth state changes to get the user ID
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            userId = user.uid;
            userIdSpan.textContent = userId;
            statusMessage.textContent = 'Authenticated successfully.';
            statusMessage.className = 'mt-6 text-green-500 font-bold';
        } else {
            statusMessage.textContent = 'Not authenticated. Signing in anonymously...';
            statusMessage.className = 'mt-6 text-orange-500 font-bold';
            try {
                if (authTokenFromUrl) {
                    await signInWithCustomToken(auth, authTokenFromUrl);
                } else {
                    await signInAnonymously(auth);
                }
            } catch (error) {
                console.error("Error during authentication:", error);
                statusMessage.textContent = 'Authentication failed. Please try again.';
                statusMessage.className = 'mt-6 text-red-500 font-bold';
            }
        }
    });
});

// Event listener to show a preview of the selected image
imageUploadInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            imagePreviewContainer.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    } else {
        imagePreviewContainer.classList.add('hidden');
    }
});

// Form submission handler
uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!db || !userId) {
        statusMessage.textContent = 'Database not ready. Please wait...';
        statusMessage.className = 'mt-6 text-orange-500 font-bold';
        return;
    }

    const imageFile = imageUploadInput.files[0];
    const sensorData = sensorDataTextarea.value.trim();

    if (!imageFile || !sensorData) {
        statusMessage.textContent = 'Please upload an image and enter sensor data.';
        statusMessage.className = 'mt-6 text-red-500 font-bold';
        return;
    }

    statusMessage.textContent = 'Uploading data...';
    statusMessage.className = 'mt-6 text-blue-500 font-bold';
    const saveButton = document.getElementById('save-button');
    saveButton.disabled = true;

    const reader = new FileReader();
    reader.onload = async (event) => {
        const base64Image = event.target.result;

        try {
            // Create a document to store in the Firestore collection
            const docData = {
                image: base64Image,
                hyperspectral_data: sensorData,
                timestamp: new Date().toISOString(),
                userId: userId
            };

            // For a multi-user app, this collection should be public
            const app_id = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
            const collectionPath = `artifacts/${app_id}/public/data/hyperspectral_images`;

            await addDoc(collection(db, collectionPath), docData);

            statusMessage.textContent = 'Data uploaded successfully!';
            statusMessage.className = 'mt-6 text-green-500 font-bold';
            uploadForm.reset();
            imagePreviewContainer.classList.add('hidden');

        } catch (error) {
            console.error("Error adding document:", error);
            statusMessage.textContent = `Error uploading data: ${error.message}`;
            statusMessage.className = 'mt-6 text-red-500 font-bold';
        } finally {
            saveButton.disabled = false;
        }
    };
    reader.readAsDataURL(imageFile);
});