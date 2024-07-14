const process = require("./process");
const ao = require("ao");

function handle(msgJSON, aoJSON) {
    // decode inputs
    const msg = JSON.parse(msgJSON);
    const env = JSON.parse(aoJSON);
    ao.init(env);

    // relocate custom tags to root message
    const normalizedMsg = ao.normalize(msg);

    // handle process
    //
    // The process may throw an error, either intentionally or unintentionally
    // So we need to be able to catch these unhandled errors and bubble them
    // across the interop with some indication that it was unhandled
    //
    // To do this, we wrap the process.handle with a try/catch block,
    // and return both the status and response as JSON. The caller can examine the status boolean and decide how to handle the error
    let status = true;
    let response;

    try {
        response = process.handle(normalizedMsg, ao);
    } catch (error) {
        status = false;
        response = error.message;
    }

    // encode output
    const responseJSON = JSON.stringify({ok: status, response: response});
    return responseJSON;
}

module.exports = handle;
