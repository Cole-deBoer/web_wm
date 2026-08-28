export default {
    tabWidth: 4,
    useTabs: false,
    semi: true,
    singleQuote: false,
    trailingComma: "all",
    endOfLine: "auto",
    // package.json et al. already use npm's conventional 2-space indent.
    overrides: [
        {
            files: ["**/*.json", "**/*.yaml", "**/*.yml"],
            options: { tabWidth: 2 },
        },
    ],
};
