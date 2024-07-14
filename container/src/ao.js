const ao = {
    _version: "0.0.4",
    id: "",
    _module: "",
    authorities: [],
    _ref: 0,
    outbox: { Output: [], Messages: [], Spawns: [], Assignments: [] }
};

function _includes(list) {
    return function (key) {
        return list.includes(key);
    };
}

function isArray(table) {
    if (Array.isArray(table)) {
        for (let i = 0; i < table.length; i++) {
            if (table[i] === undefined) {
                return false;
            }
        }
        return true;
    }
    return false;
}

function padZero32(num) {
    return num.toString().padStart(32, '0');
}

ao.normalize = function (msg) {
    msg.Tags.forEach(tag => {
        if (!_includes(['Data-Protocol', 'Variant', 'From-Process', 'From-Module', 'Type', 'Ref_', 'From', 'Owner', 'Anchor', 'Target', 'Data', 'Tags'])(tag.name)) {
            msg[tag.name] = tag.value;
        }
    });
    return msg;
};

ao.init = function (env) {
    if (ao.id === "") {
        ao.id = env.Process.Id;
    }

    if (ao._module === "") {
        env.Process.Tags.forEach(tag => {
            if (tag.name === "Module") {
                ao._module = tag.value;
            }
        });
    }

    if (ao.authorities.length < 1) {
        env.Process.Tags.forEach(tag => {
            if (tag.name === "Authority") {
                ao.authorities.push(tag.value);
            }
        });
    }

    ao.outbox = { Output: [], Messages: [], Spawns: [], Assignments: [] };
    ao.env = env;
};

ao.log = function (txt) {
    if (typeof ao.outbox.Output === 'string') {
        ao.outbox.Output = [ao.outbox.Output];
    }
    ao.outbox.Output.push(txt);
};

ao.clearOutbox = function () {
    ao.outbox = { Output: [], Messages: [], Spawns: [], Assignments: [] };
};

ao.send = function (msg) {
    if (typeof msg !== 'object') throw new Error('msg should be an object');
    ao._ref++;

    const message = {
        Target: msg.Target,
        Data: msg.Data,
        Anchor: padZero32(ao._ref),
        Tags: [
            { name: "Data-Protocol", value: "ao" },
            { name: "Variant", value: "ao.TN.1" },
            { name: "Type", value: "Message" },
            { name: "From-Process", value: ao.id },
            { name: "From-Module", value: ao._module },
            { name: "Ref_", value: ao._ref.toString() }
        ]
    };

    for (const key in msg) {
        if (!_includes(["Target", "Data", "Anchor", "Tags", "From"])(key)) {
            message.Tags.push({ name: key, value: msg[key] });
        }
    }

    if (msg.Tags) {
        if (isArray(msg.Tags)) {
            msg.Tags.forEach(tag => {
                message.Tags.push(tag);
            });
        } else {
            for (const key in msg.Tags) {
                message.Tags.push({ name: key, value: msg.Tags[key] });
            }
        }
    }

    ao.outbox.Messages.push(message);

    return message;
};

ao.spawn = function (module, msg) {
    if (typeof module !== 'string') throw new Error('module source id is required!');
    if (typeof msg !== 'object') throw new Error('msg should be an object');
    ao._ref++;

    const spawn = {
        Data: msg.Data || "NODATA",
        Anchor: padZero32(ao._ref),
        Tags: [
            { name: "Data-Protocol", value: "ao" },
            { name: "Variant", value: "ao.TN.1" },
            { name: "Type", value: "Process" },
            { name: "From-Process", value: ao.id },
            { name: "From-Module", value: ao._module },
            { name: "Module", value: module },
            { name: "Ref_", value: ao._ref.toString() }
        ]
    };

    for (const key in msg) {
        if (!_includes(["Target", "Data", "Anchor", "Tags", "From"])(key)) {
            spawn.Tags.push({ name: key, value: msg[key] });
        }
    }

    if (msg.Tags) {
        if (isArray(msg.Tags)) {
            msg.Tags.forEach(tag => {
                spawn.Tags.push(tag);
            });
        } else {
            for (const key in msg.Tags) {
                spawn.Tags.push({ name: key, value: msg.Tags[key] });
            }
        }
    }

    ao.outbox.Spawns.push(spawn);

    return spawn;
};

ao.assign = function (assignment) {
    if (typeof assignment !== 'object') throw new Error('assignment should be an object');
    if (!Array.isArray(assignment.Processes)) throw new Error('Processes should be an array');
    if (typeof assignment.Message !== 'string') throw new Error('Message should be a string');
    ao.outbox.Assignments.push(assignment);
};

ao.isTrusted = function (msg) {
    return ao.authorities.includes(msg.From) || ao.authorities.includes(msg.Owner);
};

ao.result = function (result) {
    if (ao.outbox.Error || result.Error) {
        return { Error: result.Error || ao.outbox.Error };
    }
    return {
        Output: result.Output || ao.outbox.Output,
        Messages: ao.outbox.Messages,
        Spawns: ao.outbox.Spawns,
        Assignments: ao.outbox.Assignments
    };
};

module.exports = ao;
