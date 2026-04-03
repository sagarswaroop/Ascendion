=TEXTAFTER(
    INDEX(
        FILTER(TEXTSPLIT(F230, "|"),
            ISNUMBER(SEARCH("bill available", TEXTSPLIT(F230, "|")))
        ),
        1),
    "Project ")

