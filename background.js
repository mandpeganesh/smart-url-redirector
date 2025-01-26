chrome.runtime.onInstalled.addListener(() => {
    const defaultShortcuts = {
        g: { url: "https://www.google.com", category: "Search Engine" },
        gh: { url: "https://github.com", category: "Work" },
        yt: { url: "https://www.youtube.com", category: "Video" },
        sof: { url: "https://stackoverflow.com", category: "Work" },
    };

    chrome.storage.sync.set({ shortcuts: defaultShortcuts });
});

chrome.omnibox.onInputEntered.addListener((input) => {
    chrome.storage.sync.get('shortcuts', ({ shortcuts }) => {
        const [shortcut, ...params] = input.split(' ');
        if (shortcuts[shortcut]) {
            let redirectUrl = shortcuts[shortcut].url;
            if (redirectUrl.includes('[params]')) {
                redirectUrl = redirectUrl.replace('[params]', params.join('+'));
            }

            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    chrome.tabs.update(tabs[0].id, { url: redirectUrl });
                } else {
                    chrome.tabs.create({ url: redirectUrl });
                }
            });
        }
    });
});
