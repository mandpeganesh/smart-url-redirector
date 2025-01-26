document.addEventListener('DOMContentLoaded', () => {
    const shortcutKey = document.getElementById('shortcutKey');
    const fullUrl = document.getElementById('fullUrl');
    const saveButton = document.getElementById('saveShortcut');
    const cancelButton = document.getElementById('cancelShortcut');
    const formOverlay = document.getElementById('formOverlay');
    const shortcutCategory = document.getElementById('shortcutCategory');
    const newCategoryInput = document.getElementById('newCategoryInput');
    const shortcutList = document.getElementById('shortcutList');
    const toast = document.getElementById('toast');
    const searchBar = document.querySelector('.search-bar');
    const exportButton = document.getElementById('exportShortcuts');
    const importInput = document.getElementById('importShortcuts');
    const suggestionsList = document.createElement('div');
    suggestionsList.className = 'suggestions-list';
    formOverlay.appendChild(suggestionsList);
    let categories = ['Search Engine', 'Social', 'Work']; // Default categories
    let editingKey = null;
    let shortcuts = {};

    // Toast functionality
    const showToast = (message, type = 'info') => {
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.style.display = 'block';
        setTimeout(() => (toast.style.display = 'none'), 3000);
    };

    // Validate URL
    const isValidUrl = (url) => {
        try {
            new URL(url);
            return true;
        } catch (e) {
            return /^[a-zA-Z]+:\/\/.+/.test(url);
        }
    };

    // Show/hide form overlay
    const showForm = () => {
        formOverlay.style.display = 'flex';
        shortcutKey.focus();
        fetchHistorySuggestions();
    };

    const hideForm = () => {
        formOverlay.style.display = 'none';
        shortcutKey.value = '';
        fullUrl.value = '';
        shortcutCategory.value = 'Search';
        newCategoryInput.value = '';
        newCategoryInput.style.display = 'none';
        editingKey = null;
        suggestionsList.innerHTML = '';
    };

    // Populate categories in dropdown
    const populateCategories = () => {
        shortcutCategory.innerHTML = categories
            .map((cat) => `<option value="${cat}">${cat}</option>`)
            .join('');
        shortcutCategory.innerHTML += `<option value="add-new-category">+ Add New Category</option>`;
    };

    // Handle category selection
    shortcutCategory.addEventListener('change', () => {
        if (shortcutCategory.value === 'add-new-category') {
            newCategoryInput.style.display = 'block';
            newCategoryInput.focus();
        } else {
            newCategoryInput.style.display = 'none';
        }
    });

    // Load and render shortcuts
    const loadShortcuts = async () => {
        const data = await chrome.storage.sync.get('shortcuts');
        shortcuts = data.shortcuts || {};
        populateCategories();
        renderShortcuts(shortcuts);
    };

    const renderShortcuts = (shortcuts) => {
        shortcutList.innerHTML = '';

        const categoriesMap = {};
        Object.entries(shortcuts).forEach(([key, { url, category }]) => {
            if (!categoriesMap[category]) categoriesMap[category] = [];
            categoriesMap[category].push({ key, url });
        });

        Object.entries(categoriesMap).forEach(([category, items]) => {
            const categoryHeader = document.createElement('h3');
            categoryHeader.textContent = category;
            shortcutList.appendChild(categoryHeader);

            items.forEach(({ key, url }) => {
                const shortcutItem = document.createElement('div');
                shortcutItem.className = 'shortcut-item';
                shortcutItem.innerHTML = `
                    <div class="shortcut-info">
                        <span class="shortcut-key">${key}</span>
                        <span class="shortcut-url">${url}</span>
                    </div>
                    <div class="shortcut-actions">
                        <button class="edit-btn" data-key="${key}" data-url="${url}" data-category="${category}">Edit</button>
                        <button class="delete-btn" data-key="${key}">Delete</button>
                    </div>
                `;
                shortcutList.appendChild(shortcutItem);
            });
        });

        document.querySelectorAll('.delete-btn').forEach((btn) => {
            btn.addEventListener('click', async (e) => {
                const key = e.currentTarget.dataset.key;
                delete shortcuts[key];
                await chrome.storage.sync.set({ shortcuts });
                loadShortcuts();
                showToast('Shortcut deleted', 'success');
            });
        });

        document.querySelectorAll('.edit-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                const key = e.currentTarget.dataset.key;
                const url = e.currentTarget.dataset.url;
                const category = e.currentTarget.dataset.category;

                // Set the form to edit mode
                shortcutKey.value = key;
                fullUrl.value = url;
                shortcutCategory.value = category;
                newCategoryInput.style.display = 'none';
                editingKey = key;

                showForm();
            });
        });
    };

    // Fetch history suggestions
    const fetchHistorySuggestions = () => {
        chrome.history.search({ text: '', maxResults: 10 }, (historyItems) => {
            suggestionsList.innerHTML = '<h3>Suggestions</h3>';
            historyItems.forEach((item) => {
                const suggestionItem = document.createElement('div');
                suggestionItem.className = 'suggestion-item';
                suggestionItem.textContent = item.url;
                suggestionItem.addEventListener('click', () => {
                    fullUrl.value = item.url;
                    suggestionsList.innerHTML = '';
                });
                suggestionsList.appendChild(suggestionItem);
            });
        });
    };

    // Save shortcut with category logic
    saveButton.addEventListener('click', async (e) => {
        e.preventDefault();

        const key = shortcutKey.value.trim();
        const url = fullUrl.value.trim();
        let category = shortcutCategory.value;

        // Handle new category creation
        if (category === 'add-new-category') {
            category = newCategoryInput.value.trim();
            if (!category) {
                showToast('Please enter a new category name', 'error');
                return;
            }

            if (!categories.includes(category)) {
                categories.push(category);
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                shortcutCategory.appendChild(option);
            }
        }

        if (!key || !url) {
            showToast('Please fill in both fields', 'error');
            return;
        }

        if (!isValidUrl(url)) {
            showToast('Please enter a valid URL', 'error');
            return;
        }

        if (editingKey) {
            // Update the existing shortcut
            shortcuts[editingKey] = { url, category };
        } else {
            // Add a new shortcut
            shortcuts[key] = { url, category };
        }
        await chrome.storage.sync.set({ shortcuts });

        hideForm();
        loadShortcuts();
        showToast(editingKey ? 'Shortcut updated' : 'Shortcut saved', 'success');
    });

    // Cancel button
    cancelButton.addEventListener('click', (e) => {
        e.preventDefault();
        hideForm();
    });

    // Search functionality
    searchBar.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filteredShortcuts = Object.fromEntries(
            Object.entries(shortcuts).filter(([key, { url }]) =>
                key.toLowerCase().includes(query) || url.toLowerCase().includes(query)
            )
        );
        renderShortcuts(filteredShortcuts);
    });

    // Export shortcuts
    exportButton.addEventListener('click', async () => {
        const { shortcuts } = await chrome.storage.sync.get('shortcuts');
        const blob = new Blob([JSON.stringify(shortcuts, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'shortcuts.json';
        a.click();
        URL.revokeObjectURL(url);
    });

    // Import shortcuts
    importInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const json = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsText(file);
            });

            const importedShortcuts = JSON.parse(json);
            if (typeof importedShortcuts !== 'object') throw new Error('Invalid format');

            await chrome.storage.sync.set({ shortcuts: importedShortcuts });
            loadShortcuts();
            showToast('Shortcuts imported', 'success');
        } catch (error) {
            showToast('Failed to import shortcuts', 'error');
        }
    });

    // Initial load
    loadShortcuts();

    // Show form when "Add Shortcut" button is clicked
    document.querySelector('.add-all').addEventListener('click', showForm);
});