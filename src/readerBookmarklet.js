/*!
 * readerBookmarklet v0.2.0
 * Dynamic Bookmarklet to read text from a website
 *
 * Copyright (c) 2017-2019 - Tom Lutzenberger (lutzenbergerthomas at gmail dot com)
 * https://github.com/tomlutzenberger/readerBookmarklet
 * https://tomlutzenberger.github.io/readerBookmarklet/
 *
 * @license: Licensed under the MIT license
 * https://github.com/tomlutzenberger/readerBookmarklet/blob/master/LICENSE
 */

/* jslint esnext:true */


const FIRST_ELEMENT = 0;
const ONE = 1;


/**
 * @method createDomElement
 * @description Create a DOMElement on the fly
 *
 * @param {(String|null)} tagName - Tag name of the new element
 * @param {Object} properties - Object holding all properties
 * @param {Object} attributes - Object holding all attributes
 *
 * @return {HTMLElement}
 */
const createDomElement = (tagName, properties, attributes) => {
    'use strict';

    if (typeof tagName !== 'string' && tagName.length < ONE) {
        return null;
    }

    const domElement = document.createElement(tagName);

    if (properties !== undefined && Object.keys(properties).length > 0 && properties.constructor === Object) {
        for (const prop in properties) {
            if (!Object.prototype.hasOwnProperty.call(properties, prop)) {
                continue;
            }

            domElement[prop] = properties[prop];
        }
    }

    if (attributes !== undefined && Object.keys(attributes).length > 0 && attributes.constructor === Object) {
        for (const attr in attributes) {
            if (!Object.prototype.hasOwnProperty.call(attributes, attr)) {
                continue;
            }

            domElement.setAttribute(attr, attributes[attr]);
        }
    }

    return domElement;
};

/**
 * @method appendChildsToDomElement
 * @description Append multiple child elements to a DOM Element
 *
 * @param {HTMLElement} parent - The DOM Element to append childs to
 * @param {Array} elements -
 */
const appendChildsToDomElement = (parent, elements) => {
    if (!(parent instanceof HTMLElement)) {
        return;
    }
    if (!Array.isArray(elements) || elements.length < ONE) {
        return;
    }

    elements.forEach((element) => {
        if (!(element instanceof HTMLElement)) {
            return;
        }
        parent.appendChild(element);
    });
};


const readerBookmarklet = () => {
    'use strict';

    const synth = window.speechSynthesis;
    let reader = new SpeechSynthesisUtterance();

    /** @type {HTMLElement} readerUi */
    let readerUi = null;

    /** @type {HTMLElement} readerStyles */
    let readerStyles = null;

    /** @type {HTMLElement|HTMLSelectElement} selectLang */
    let selectLang = null;

    /** @type {HTMLElement|HTMLSelectElement} selectLang */
    let selectVoice = null;

    /** @type {HTMLElement|HTMLButtonElement} btnSearch */
    let btnSearch = null;

    /** @type {HTMLElement|HTMLButtonElement} btnPlayPause */
    let btnPlayPause = null;

    /** @type {HTMLElement|HTMLButtonElement} btnStop */
    let btnStop = null;

    /** @type {Object} voices */
    const voices = {};

    /** @type {String} docLang */
    let docLang = null;


    /**
     * @method collectVoices
     * @description Pushes all available SpeechSynthesizer Voices into an array index by language code
     *
     * @returns {void}
     */
    const collectVoices = () => {
        synth.getVoices().forEach((voice) => {
            const lang = voice.lang.split('-')[FIRST_ELEMENT];

            if (voices[lang] === undefined) {
                voices[lang] = [];
            }

            voices[lang].push(voice);
        });
    };


    /**
     * @method setStyles
     * @description Creates and injects a style tag with CSS into the `<head>` element
     *
     * @returns {void}
     */
    const setStyles = () => {
        /*
        readerStyles = document.createElement('style');
        readerStyles.setAttribute('id', 'reader-bookmarklet-style');
        readerStyles.setAttribute('type', 'text/css');
        */

        const textContent = `
            body.reader-bookmarklet-searching *:not([id^=reader-bookmarklet]):hover {
                border: 1px dotted #f00;
            }

            #reader-bookmarklet {
                background: rgba(68,68,68,0.5);
                border: 1px solid #333;
                color: #333;
                top: 0;
                right: 0;
                padding: 20px;
                position: fixed;
                z-index: 9999;
            }

            #reader-bookmarklet-title {
                margin-bottom: 10px;
                margin-top: 0;

                font-size: 20px;
            }
        `;

        readerStyles = createDomElement('style', { textContent: textContent }, {
            id: 'reader-bookmarklet-style',
            type: 'text/css',
        });

        document.querySelector('head').appendChild(readerStyles);
    };


    /**
     * @method createUi
     * @description Creates and injects a div tag (UI wrapper) into the `<body>` element
     *
     * @returns {void}
     */
    const createUi = () => {
        readerUi = createDomElement('div', {}, { id: 'reader-bookmarklet' });
        selectLang = createDomElement('select', {}, { id: 'reader-bookmarklet-lang' });
        selectLang.appendChild(createDomElement('option', { textContent: '---' }, {}));
        selectVoice = createDomElement('select', {}, { id: 'reader-bookmarklet-voice' });
        selectVoice.appendChild(createDomElement('option', { textContent: '---' }, {}));
        btnSearch = createDomElement('button', { innerHTML: '&#128270;' }, { id: 'reader-bookmarklet-search' });
        btnPlayPause = createDomElement('button', { textContent: '\u23ef' }, { id: 'reader-bookmarklet-play-pause' });
        btnStop = createDomElement('button', { textContent: '\u23f9' }, { id: 'reader-bookmarklet-stop' });

        appendChildsToDomElement(readerUi, [
            createDomElement('h1', { textContent: 'Reader Bookmarklet' }, { id: 'reader-bookmarklet-title' }),
            createDomElement('label', { textContent: 'Language' }, { for: 'reader-bookmarklet-lang' }),
            selectLang,
            createDomElement('br', {}, {}),
            createDomElement('label', { textContent: 'Voice' }, { for: 'reader-bookmarklet-voice' }),
            selectVoice,
            createDomElement('br', {}, {}),
            btnSearch,
            btnPlayPause,
            btnStop,
        ]);

        document.querySelector('body').appendChild(readerUi);
    };


    /**
     * @method getUiExists
     * @description Check if the UI element already exists in the DOM
     *
     * @returns {Boolean}
     */
    const getUiExists = () => {
        return document.getElementById('reader-bookmarklet-style') !== null && document.getElementById('reader-bookmarklet') !== null;
    };


    /**
     * @method populateVoiceData
     * @description Execute script
     *
     * @returns {void}
     */
    const populateVoiceData = () => {
        selectLang.innerHTML = '';

        for (const lang in voices) {
            if (!Object.prototype.hasOwnProperty.call(voices, lang)) {
                continue;
            }

            const langOption = createDomElement('option', { textContent: lang }, { value: lang });

            if (lang === docLang) {
                langOption.setAttribute('selected', 'selected');
                populateLangVoices(lang);
            }

            selectLang.appendChild(langOption);
        }
    };


    /**
     * @method populateLangVoices
     * @description Execute script
     *
     * @param {String} language - Language code
     * @returns {void}
     */
    const populateLangVoices = (language) => {
        selectVoice.innerHTML = '';

        if (Object.prototype.hasOwnProperty.call(voices, language)) {
            for (let index = 0; index < voices[language].length; index++) {
                const voice = voices[language][index];
                const voiceOption = createDomElement('option', { textContent: voice.name }, { value: index });

                if (index === FIRST_ELEMENT) {
                    voiceOption.setAttribute('selected', 'selected');
                }

                selectVoice.appendChild(voiceOption);
            }
        }
    };

    /**
     * @method updateLangVoices
     * @description Execute script
     *
     * @param {Event} event - Language code
     * @returns {void}
     */
    const updateLangVoices = (event) => {
        /** @type {HTMLSelectElement} */
        const target = event.target;
        for (const optionIndex in selectLang.options) {
            if (Object.prototype.hasOwnProperty.call(selectLang.options, optionIndex)) {
                selectLang.options[optionIndex].removeAttribute('selected');
            }
        }
        selectLang.options[target.selectedIndex].setAttribute('selected', 'selected');

        populateLangVoices(target.value);
    };


    /**
     * @method updateReader
     * @description Execute script
     *
     * @returns {void}
     */
    const updateReader = () => {
        const voiceIndex = selectVoice.options[selectVoice.selectedIndex].value;
        const lang = selectLang.options[selectLang.selectedIndex].value;
        console.log(voiceIndex);
        console.log(lang);
        reader.voice = voices[lang][voiceIndex];
        reader.lang = lang;
    };


    /**
     * @method execute
     * @description Execute script
     *
     * @returns {void}
     */
    const initialize = () => {
        if (docLang === null) {
            docLang = document.getElementsByTagName('html')[FIRST_ELEMENT].getAttribute('lang');
            docLang = docLang === null ? 'en' : docLang.split('-')[FIRST_ELEMENT];
        }

        setStyles();
        createUi();

        btnSearch.addEventListener('click', () => {
            document.querySelector('body').classList.add('reader-bookmarklet-searching');

            const bodyElements = document.querySelectorAll('body.reader-bookmarklet-searching *:not([id^=reader-bookmarklet])');
            bodyElements.forEach((element) => {
                element.addEventListener('click', (event) => {
                    event.stopPropagation();
                    console.log(event.target);
                    reader = new SpeechSynthesisUtterance(event.target.innerText);
                    console.log(reader.text);

                    document.querySelector('body').classList.remove('reader-bookmarklet-searching');
                    bodyElements.forEach((element) => {
                        element.removeEventListener('click', () => {
                        });
                    });
                }, { capture: false, once: true });
            });
        });

        btnPlayPause.addEventListener('click', () => {
            if (synth.speaking) {
                synth.pause();
            } else if (synth.paused) {
                updateReader();
                synth.resume();
            } else if (reader.text !== null && reader.text !== '') {
                updateReader();
                synth.speak(reader);
            }
        });

        btnStop.addEventListener('click', () => {
            synth.cancel();
        });

        window.speechSynthesis.onvoiceschanged = () => {
            collectVoices();
            populateVoiceData();
            selectLang.onchange = updateLangVoices;
            selectVoice.onchange = (event) => {
                for (const optionIndex in selectVoice.options) {
                    if (Object.prototype.hasOwnProperty.call(selectVoice.options, optionIndex)) {
                        selectVoice.options[optionIndex].removeAttribute('selected');
                    }
                }
                selectVoice.options[event.target.selectedIndex].setAttribute('selected', 'selected');
            };
        };
    };


    /**
     * @method execute
     * @description Execute script
     *
     * @returns {void}
     */
    const execute = () => {
        if (!getUiExists()) {
            initialize();
        } else {
            populateVoiceData();
        }
    };


    return { execute };
};


readerBookmarklet().execute();
