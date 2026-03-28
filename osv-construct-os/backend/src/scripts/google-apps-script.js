const PORTAL_WEBHOOK = "https://your-hosted-url.com/api/webhook/leads";
const LABEL_NAME = "osv-processed";

function checkLeads() {
    const label = getOrCreateLabel(LABEL_NAME);
    const threads = GmailApp.search('to:leads@buildwithosv.com.au is:unread', 0, 20);

    threads.forEach(thread => {
        const msg = thread.getMessages()[0];
        const payload = {
            source: "Email",
            subject: msg.getSubject(),
            body: msg.getPlainBody(),
            receivedAt: new Date().toISOString(),
            from: msg.getFrom()
        };
        
        UrlFetchApp.fetch(PORTAL_WEBHOOK, {
            method: "POST",
            contentType: "application/json",
            payload: JSON.stringify(payload)
        });
        
        thread.addLabel(label);
        thread.markRead();
    });
}

function getOrCreateLabel(name) {
    let label = GmailApp.getUserLabelByName(name);
    if (!label) label = GmailApp.createLabel(name);
    return label;
}
