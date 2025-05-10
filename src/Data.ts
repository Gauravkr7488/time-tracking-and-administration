export class Data{
    public static readonly MESSAGES = {
        ERRORS: {
            NO_ACTIVE_TEXT_EDITOR: "No active text editor.",
            NO_WORD_AT_CURSOR: "No word found at cursor position. Place cursor on a YAML key.",
            NO_LINK_FOUND: "No link found containing the cursor.",
            THIS_COMMAND_ONLY_WORKS_WITH_YAML_FILES : "This command only works with YAML files."
        }
    }

    public static readonly STATE_KEYS = {
        EXTRACTED_YAML_KEY: "extractedYamlKey",
        CAPTURED_DOCUMENT_URI: "capturedDocumentUri",
        DETECTED_YAML_LINK: "detectedYamlLink"
    }
    
    public static readonly REGEX_PATTERNS = {
        LINK: /-->.*<\:/g,
        COLON: /:$/
    }

    public static readonly MISC = {
        YAML: "yaml"
    }

}
