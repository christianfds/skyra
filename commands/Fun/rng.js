exports.run = async (client, msg, [...words]) => {
    if (words.length < 2) throw "please write at least 2 options separated with ', '.";

    const aword = [];
    const filtered = [];
    for (let i = 0; i < words.length; i++) {
        if (!aword.includes(words[i])) aword.push(words[i]);
        else filtered.push(words[i]);
    }

    if (aword.length < 2) throw `why would I accept duplicated words? '${filtered.join("', '")}'.`;
    return msg.send(
        `🕺 *Eeny, meeny, miny, moe, catch a tiger by the toe...* ${msg.author}, I choose:\n` +
        `${"```"}${aword[Math.floor(Math.random() * aword.length)]}${"```"}`,
    );
};

exports.conf = {
    enabled: true,
    runIn: ["text", "dm", "group"],
    aliases: ["choice"],
    permLevel: 0,
    botPerms: [],
    requiredFuncs: [],
    spam: true,
    mode: 0,
    cooldown: 10,
};

exports.help = {
    name: "rng",
    description: "Eeny, meeny, miny, moe, catch a tiger by the toe...",
    usage: "<words:string> [...]",
    usageDelim: ", ",
    extendedHelp: [
        "Should I wash the dishes? Or should I throw the dishes throught the window?",
        "",
        "Usage:",
        "&rng <text1>, <text2>, ...",
        "",
        "Examples:",
        "&rng Should Wash the dishes, Throw the dishes throught the window",
        "❯❯ \" Throw the dishes throught the window \" (random)",
    ].join("\n"),
};
