
const process = { _version: "0.0.1" };

process.handle = function(msg, ao) {
    if (!ao.isTrusted(msg)) {
        throw new Error('ao Message is not trusted');
    }

    if (msg.Data === "ping") {
        ao.send({ Target: msg.From, Data: "pong" });
    }

    return ao.result({
        Output: 'sent pong reply'
    });
};

module.exports = process;

