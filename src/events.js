const eventReceivers = new Set();

const handler = (req, res) => {
    
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    eventReceivers.add(res);

    res.on("close", () => {
        eventReceivers.delete(res);
    });

};

const broadcast = (obj) => {
    const payload = `data: ${JSON.stringify(obj)}\n\n`;
    for(const receiver of eventReceivers) {
        receiver.write(payload);
    }
};

module.exports = {
    handler: handler,
    broadcast: broadcast
};