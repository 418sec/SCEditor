﻿import * as dom from './dom.js';
import * as utils from './utils.js';
import PluginManager from './PluginManager.js';
import RangeHelper from './RangeHelper.js';
import _tmpl from './templates.js';
import * as escape from './escape.js';
import * as browser from './browser.js';

var globalWin  = window;
var globalDoc  = document;

var IE_VER = browser.ie;

// In IE < 11 a BR at the end of a block level element
// causes a line break. In all other browsers it's collapsed.
var IE_BR_FIX = IE_VER && IE_VER < 11;

var IMAGE_MIME_REGEX = /^image\/(p?jpe?g|gif|png|bmp)$/i;

var EMOTICONS_SELECTOR = 'img[data-sceditor-emoticon]';

/**
 * SCEditor - A lightweight WYSIWYG editor
 *
 * @param {Element} el The textarea to be converted
 * @return {Object} options
 * @class sceditor
 * @name sceditor
 */
export default function SCEditor(el, options) {
	/**
	 * Alias of this
	 *
	 * @private
	 */
	var base = this;

	/**
	 * The textarea element being replaced
	 *
	 * @type {HTMLTextAreaElement}
	 * @private
	 */
	var original  = el.get ? el.get(0) : el;

	/**
	 * The div which contains the editor and toolbar
	 *
	 * @type {HTMLDivElement}
	 * @private
	 */
	var editorContainer;

	/**
	 * Map of events handlers bound to this instance.
	 *
	 * @type {Object}
	 * @private
	 */
	var eventHandlers = {};

	/**
	 * The editors toolbar
	 *
	 * @type {HTMLDivElement}
	 * @private
	 */
	var toolbar;

	/**
	 * The editors iframe which should be in design mode
	 *
	 * @type {HTMLIFrameElement}
	 * @private
	 */
	var wysiwygEditor;

	/**
	 * The WYSIWYG editors body element
	 *
	 * @type {HTMLBodyElement}
	 * @private
	 */
	var wysiwygBody;

	/**
	 * The WYSIWYG editors document
	 *
	 * @type {Document}
	 * @private
	 */
	var wysiwygDoc;

	/**
	 * The editors textarea for viewing source
	 *
	 * @type {HTMLTextAreaElement}
	 * @private
	 */
	var sourceEditor;

	/**
	 * The current dropdown
	 *
	 * @type {HTMLDivElement}
	 * @private
	 */
	var dropdown;

	/**
	 * Store the last cursor position. Needed for IE because it forgets
	 *
	 * @type {Range}
	 * @private
	 */
	var lastRange;

	/**
	 * The editors locale
	 *
	 * @private
	 */
	var locale;

	/**
	 * Stores a cache of preloaded images
	 *
	 * @private
	 * @type {Array}
	 */
	var preLoadCache = [];

	/**
	 * The editors rangeHelper instance
	 *
	 * @type {sceditor.rangeHelper}
	 * @private
	 */
	var rangeHelper;

	/**
	 * Tags which require the new line fix
	 *
	 * @type {Array.<string>}
	 * @private
	 */
	var newLineFixTags = [];

	/**
	 * An array of button state handlers
	 *
	 * @type {Array}
	 * @private
	 */
	var btnStateHandlers = [];

	/**
	 * Plugin manager instance
	 *
	 * @type {PluginManager}
	 * @private
	 */
	var pluginManager;

	/**
	 * The current node containing the selection/caret
	 *
	 * @type {Node}
	 * @private
	 */
	var currentNode;

	/**
	 * The first block level parent of the current node
	 *
	 * @type {node}
	 * @private
	 */
	var currentBlockNode;

	/**
	 * The current node selection/caret
	 *
	 * @type {Object}
	 * @private
	 */
	var currentSelection;

	/**
	 * Used to make sure only 1 selection changed
	 * check is called every 100ms.
	 *
	 * Helps improve performance as it is checked a lot.
	 *
	 * @type {Boolean}
	 * @private
	 */
	var isSelectionCheckPending;

	/**
	 * If content is required (equivalent to the HTML5 required attribute)
	 *
	 * @type {Boolean}
	 * @private
	 */
	var isRequired;

	/**
	 * The inline CSS style element. Will be undefined
	 * until css() is called for the first time.
	 *
	 * @type {HTMLStyleElement}
	 * @private
	 */
	var inlineCss;

	/**
	 * Object containing a list of shortcut handlers
	 *
	 * @type {Object}
	 * @private
	 */
	var shortcutHandlers = {};

	/**
	 * An array of all the current emoticons.
	 *
	 * Only used or populated when emoticonsCompat is enabled.
	 *
	 * @type {NodeListOf<HTMLImageElement>}
	 * @private
	 */
	var currentEmoticons = [];

	/**
	 * The min and max heights that autoExpand should stay within
	 *
	 * @type {Object}
	 * @private
	 */
	var autoExpandBounds;

	/**
	 * Timeout for the autoExpand function to throttle calls
	 *
	 * @private
	 */
	var autoExpandThrottle;

	/**
	 * Cache of the current toolbar buttons
	 *
	 * @type {Object}
	 * @private
	 */
	var toolbarButtons = {};

	/**
	 * If the current autoUpdate action is canceled.
	 *
	 * @type {Boolean}
	 * @private
	 */
	var autoUpdateCanceled;

	/**
	 * Last scroll position before maximizing so
	 * it can be restored when finished.
	 *
	 * @type {number}
	 * @private
	 */
	var maximizeScrollPosiotion;

	/**
	 * Stores the contents while a paste is taking place.
	 *
	 * Needed to support browsers that lack clipboard API support.
	 *
	 * @type {?DocumentFragment}
	 * @private
	 */
	var pasteContentFragment;

	/**
	 * Private functions
	 * @private
	 */
	var	init,
		replaceEmoticons,
		handleCommand,
		saveRange,
		initEditor,
		initPlugins,
		initLocale,
		initToolBar,
		initOptions,
		initEvents,
		initCommands,
		initResize,
		initEmoticons,
		getWysiwygDoc,
		handlePasteEvt,
		handlePasteData,
		handleKeyDown,
		handleBackSpace,
		handleKeyPress,
		handleFormReset,
		handleMouseDown,
		handleEvent,
		handleDocumentClick,
		updateToolBar,
		updateActiveButtons,
		sourceEditorSelectedText,
		appendNewLine,
		checkSelectionChanged,
		checkNodeChanged,
		autofocus,
		emoticonsKeyPress,
		emoticonsCheckWhitespace,
		currentStyledBlockNode,
		triggerValueChanged,
		valueChangedBlur,
		valueChangedKeyUp,
		autoUpdate,
		autoExpand;

	/**
	 * All the commands supported by the editor
	 * @name commands
	 * @memberOf sceditor.prototype
	 */
	base.commands = utils
		.extend(true, {}, (options.commands || SCEditor.commands));

	/**
	 * Options for this editor instance
	 * @name opts
	 * @memberOf sceditor.prototype
	 */
	base.opts = options = utils.extend(
		true, {}, SCEditor.defaultOptions, options
	);

	/**
	 * Creates the editor iframe and textarea
	 * @private
	 */
	init = function () {
		original._sceditor = base;

		// Load locale
		if (options.locale && options.locale !== 'en') {
			initLocale();
		}

		editorContainer = dom.createElement('div', {
			className: 'sceditor-container'
		});

		dom.insertBefore(editorContainer, original);
		dom.css(editorContainer, 'z-index', options.zIndex);

		// Add IE version to the container to allow IE specific CSS
		// fixes without using CSS hacks or conditional comments
		if (IE_VER) {
			dom.addClass(editorContainer, 'ie ie' + IE_VER);
		}

		isRequired = original.required;
		original.required = false;

		// create the editor
		initPlugins();
		initEmoticons();
		initToolBar();
		initEditor();
		initCommands();
		initOptions();
		initEvents();

		// force into source mode if is a browser that can't handle
		// full editing
		if (!browser.isWysiwygSupported) {
			base.toggleSourceMode();
		}

		updateActiveButtons();

		var loaded = function () {
			dom.off(globalWin, 'load', loaded);

			if (options.autofocus) {
				autofocus();
			}

			autoExpand();
// TODO: use editor doc and window?
			pluginManager.call('ready');
		};
		dom.on(globalWin, 'load', loaded);
		if (globalDoc.readyState === 'complete') {
			loaded();
		}
	};

	initPlugins = function () {
		var plugins   = options.plugins;

		plugins       = plugins ? plugins.toString().split(',') : [];
		pluginManager = new PluginManager(base);

		plugins.forEach(function (plugin) {
			pluginManager.register(plugin.trim());
		});
	};

	/**
	 * Init the locale variable with the specified locale if possible
	 * @private
	 * @return void
	 */
	initLocale = function () {
		var lang;

		locale = SCEditor.locale[options.locale];

		if (!locale) {
			lang   = options.locale.split('-');
			locale = SCEditor.locale[lang[0]];
		}

		// Locale DateTime format overrides any specified in the options
		if (locale && locale.dateFormat) {
			options.dateFormat = locale.dateFormat;
		}
	};

	/**
	 * Creates the editor iframe and textarea
	 * @private
	 */
	initEditor = function () {
		var tabIndex;

		sourceEditor  = dom.createElement('textarea');
		wysiwygEditor = dom.createElement('iframe', {
			frameborder: 0,
			allowfullscreen: true
		});

		/* This needs to be done right after they are created because,
			* for any reason, the user may not want the value to be tinkered
			* by any filters.
			*/
		if (options.startInSourceMode) {
			dom.addClass(editorContainer, 'sourceMode');
			dom.hide(wysiwygEditor);
		} else {
			dom.addClass(editorContainer, 'wysiwygMode');
			dom.hide(sourceEditor);
		}

		if (!options.spellcheck) {
			dom.attr(editorContainer, 'spellcheck', 'false');
		}

		if (globalWin.location.protocol === 'https:') {
			// eslint-disable-next-line no-script-url
			dom.attr(wysiwygEditor, 'src', 'javascript:false');
		}

		// Add the editor to the container
		dom.appendChild(editorContainer, wysiwygEditor);
		dom.appendChild(editorContainer, sourceEditor);

// TODO: make this optional somehow
		base.dimensions(
			options.width || dom.width(original),
			options.height || dom.height(original)
		);

		wysiwygDoc = getWysiwygDoc();
		wysiwygDoc.open();
		wysiwygDoc.write(_tmpl('html', {
			// Add IE version class to the HTML element so can apply
			// conditional styling without CSS hacks
			attrs: IE_VER ? ' class="ie ie' + IE_VER + '"' : '',
			spellcheck: options.spellcheck ? '' : 'spellcheck="false"',
			charset: options.charset,
			style: options.style
		}));
		wysiwygDoc.close();

		wysiwygBody = wysiwygDoc.body;

		base.readOnly(!!options.readOnly);

		// iframe overflow fix for iOS, also fixes an IE issue with the
		// editor not getting focus when clicking inside
		if (browser.ios || browser.edge || IE_VER) {
			dom.height(wysiwygBody, '100%');

			if (!IE_VER) {
				dom.on(wysiwygBody, 'touchend', base.focus);
			}
		}

		tabIndex = dom.attr(original, 'tabindex');
		dom.attr(sourceEditor, 'tabindex', tabIndex);
		dom.attr(wysiwygEditor, 'tabindex', tabIndex);

		rangeHelper = new RangeHelper(wysiwygEditor.contentWindow);

		// load any textarea value into the editor
		dom.hide(original);
		base.val(original.value);
	};

	/**
	 * Initialises options
	 * @private
	 */
	initOptions = function () {
		// auto-update original textbox on blur if option set to true
		if (options.autoUpdate) {
			dom.on(wysiwygBody, 'blur', autoUpdate);
			dom.on(sourceEditor, 'blur', autoUpdate);
		}

		if (options.rtl === null) {
			options.rtl = dom.css(sourceEditor, 'direction') === 'rtl';
		}

		base.rtl(!!options.rtl);

		if (options.autoExpand) {
			// Need to update when images (or anything else) loads
			dom.on(wysiwygBody, 'load', autoExpand, dom.EVENT_CAPTURE);
			dom.on(wysiwygDoc, 'input keyup', autoExpand);
		}

		if (options.resizeEnabled) {
			initResize();
		}

		dom.attr(editorContainer, 'id', options.id);
		base.emoticons(options.emoticonsEnabled);
	};

	/**
	 * Initialises events
	 * @private
	 */
	initEvents = function () {
		var CHECK_SELECTION_EVENTS = IE_VER ?
			'selectionchange' :
			'keyup focus blur contextmenu mouseup touchend click';

		var EVENTS_TO_FORWARD = 'keydown keyup keypress ' +
			'focus blur contextmenu';

		var form = original.form;

		dom.on(globalDoc, 'click', handleDocumentClick);

		if (form) {
			dom.on(form, 'reset', handleFormReset);
			dom.on(form, 'submit', base.updateOriginal, dom.EVENT_CAPTURE);
		}

		dom.on(wysiwygBody, 'keypress', handleKeyPress);
		dom.on(wysiwygBody, 'keydown', handleKeyDown);
		dom.on(wysiwygBody, 'keydown', handleBackSpace);
		dom.on(wysiwygBody, 'keyup', appendNewLine);
		dom.on(wysiwygBody, 'blur', valueChangedBlur);
		dom.on(wysiwygBody, 'keyup', valueChangedKeyUp);
		dom.on(wysiwygBody, 'paste', handlePasteEvt);
		dom.on(wysiwygBody, CHECK_SELECTION_EVENTS, checkSelectionChanged);
		dom.on(wysiwygBody, EVENTS_TO_FORWARD, handleEvent);

		if (options.emoticonsCompat && globalWin.getSelection) {
			dom.on(wysiwygBody, 'keyup', emoticonsCheckWhitespace);
		}

		dom.on(sourceEditor, 'blur', valueChangedBlur);
		dom.on(sourceEditor, 'keyup', valueChangedKeyUp);
		dom.on(sourceEditor, 'keydown', handleKeyDown);
		dom.on(sourceEditor, EVENTS_TO_FORWARD, handleEvent);

		dom.on(wysiwygDoc, 'mousedown', handleMouseDown);
		dom.on(wysiwygDoc, 'blur', valueChangedBlur);
		dom.on(wysiwygDoc, CHECK_SELECTION_EVENTS, checkSelectionChanged);
		dom.on(wysiwygDoc, 'beforedeactivate keyup mouseup', saveRange);
		dom.on(wysiwygDoc, 'keyup', appendNewLine);
		dom.on(wysiwygDoc, 'focus', function () {
			lastRange = null;
		});

		dom.on(editorContainer, 'selectionchanged', checkNodeChanged);
		dom.on(editorContainer, 'selectionchanged', updateActiveButtons);
		dom.on(editorContainer, 'selectionchanged valuechanged nodechanged',
			handleEvent);
	};

	/**
	 * Creates the toolbar and appends it to the container
	 * @private
	 */
	initToolBar = function () {
		var	group,
			commands = base.commands,
			exclude  = (options.toolbarExclude || '').split(','),
			groups   = options.toolbar.split('|');

		toolbar = dom.createElement('div', {
			className: 'sceditor-toolbar',
			unselectable: 'on'
		});

		utils.each(groups, function (_, menuItems) {
			group = dom.createElement('div', {
				className: 'sceditor-group'
			});

			utils.each(menuItems.split(','), function (_, commandName) {
				var	button, shortcut,
					command  = commands[commandName];

				// The commandName must be a valid command and not excluded
				if (!command || exclude.indexOf(commandName) > -1) {
					return;
				}

				shortcut = command.shortcut;
				button   = _tmpl('toolbarButton', {
					name: commandName,
					dispName: base._(command.name ||
							command.tooltip || commandName)
				}, true).firstChild;

				button._sceTxtMode = !!command.txtExec;
				button._sceWysiwygMode = !!command.exec;
				dom.toggleClass(button, 'disabled', !command.exec);
				dom.on(button, 'click', function (e) {
					if (!dom.hasClass(button, 'disabled')) {
						handleCommand(button, command);
					}

					updateActiveButtons();
					e.preventDefault();
				});

				if (command.tooltip) {
					dom.attr(button, 'title',
						base._(command.tooltip) +
							(shortcut ? ' (' + shortcut + ')' : '')
					);
				}

				if (shortcut) {
					base.addShortcut(shortcut, commandName);
				}

				if (command.state) {
					btnStateHandlers.push({
						name: commandName,
						state: command.state
					});
				// exec string commands can be passed to queryCommandState
				} else if (utils.isString(command.exec)) {
					btnStateHandlers.push({
						name: commandName,
						state: command.exec
					});
				}

				dom.appendChild(group, button);
				toolbarButtons[commandName] = button;
			});

			// Exclude empty groups
			if (group.firstChild) {
				dom.appendChild(toolbar, group);
			}
		});

		// Append the toolbar to the toolbarContainer option if given
		dom.appendChild(options.toolbarContainer || editorContainer, toolbar);
	};

	/**
	 * Creates an array of all the key press functions
	 * like emoticons, ect.
	 * @private
	 */
	initCommands = function () {
		utils.each(base.commands, function (_, cmd) {
			if (cmd.forceNewLineAfter && Array.isArray(cmd.forceNewLineAfter)) {
				newLineFixTags = newLineFixTags.concat(cmd.forceNewLineAfter);
			}
		});

		appendNewLine();
	};

	/**
	 * Creates the resizer.
	 * @private
	 */
	initResize = function () {
		var	minHeight, maxHeight, minWidth, maxWidth,
			mouseMoveFunc, mouseUpFunc,
			grip        = dom.createElement('div', {
				className: 'sceditor-grip'
			}),
			// Cover is used to cover the editor iframe so document
			// still gets mouse move events
			cover       = dom.createElement('div', {
				className: 'sceditor-resize-cover'
			}),
			moveEvents  = 'touchmove mousemove',
			endEvents   = 'touchcancel touchend mouseup',
			startX      = 0,
			startY      = 0,
			newX        = 0,
			newY        = 0,
			startWidth  = 0,
			startHeight = 0,
			origWidth   = dom.width(editorContainer),
			origHeight  = dom.height(editorContainer),
			isDragging  = false,
			rtl         = base.rtl();

		minHeight = options.resizeMinHeight || origHeight / 1.5;
		maxHeight = options.resizeMaxHeight || origHeight * 2.5;
		minWidth  = options.resizeMinWidth  || origWidth  / 1.25;
		maxWidth  = options.resizeMaxWidth  || origWidth  * 1.25;

		mouseMoveFunc = function (e) {
			// iOS uses window.event
			if (e.type === 'touchmove') {
				e    = globalWin.event;
				newX = e.changedTouches[0].pageX;
				newY = e.changedTouches[0].pageY;
			} else {
				newX = e.pageX;
				newY = e.pageY;
			}

			var	newHeight = startHeight + (newY - startY),
				newWidth  = rtl ?
					startWidth - (newX - startX) :
					startWidth + (newX - startX);

			if (maxWidth > 0 && newWidth > maxWidth) {
				newWidth = maxWidth;
			}
			if (minWidth > 0 && newWidth < minWidth) {
				newWidth = minWidth;
			}
			if (!options.resizeWidth) {
				newWidth = false;
			}

			if (maxHeight > 0 && newHeight > maxHeight) {
				newHeight = maxHeight;
			}
			if (minHeight > 0 && newHeight < minHeight) {
				newHeight = minHeight;
			}
			if (!options.resizeHeight) {
				newHeight = false;
			}

			if (newWidth || newHeight) {
				base.dimensions(newWidth, newHeight);
			}

			e.preventDefault();
		};

		mouseUpFunc = function (e) {
			if (!isDragging) {
				return;
			}

			isDragging = false;

			dom.hide(cover);
			dom.removeClass(editorContainer, 'resizing');
			dom.off(globalDoc, moveEvents, mouseMoveFunc);
			dom.off(globalDoc, endEvents, mouseUpFunc);

			e.preventDefault();
		};

		dom.appendChild(editorContainer, grip);
		dom.appendChild(editorContainer, cover);
		dom.hide(cover);

		dom.on(grip, 'touchstart mousedown', function (e) {
			// iOS uses window.event
			if (e.type === 'touchstart') {
				e      = globalWin.event;
				startX = e.touches[0].pageX;
				startY = e.touches[0].pageY;
			} else {
				startX = e.pageX;
				startY = e.pageY;
			}

			startWidth  = dom.width(editorContainer);
			startHeight = dom.height(editorContainer);
			isDragging  = true;

			dom.addClass(editorContainer, 'resizing');
			dom.show(cover);
			dom.on(globalDoc, moveEvents, mouseMoveFunc);
			dom.on(globalDoc, endEvents, mouseUpFunc);

			e.preventDefault();
		});
	};

	/**
	 * Prefixes and preloads the emoticon images
	 * @private
	 */
	initEmoticons = function () {
		var	emoticons = options.emoticons,
			root      = options.emoticonsRoot;

		if (!emoticons || !options.emoticonsEnabled) {
			return;
		}

		utils.each(emoticons, function (idx, val) {
			utils.each(val, function (key, url) {
				// Prefix emoticon root to emoticon urls
				if (root) {
					url = {
						url: root + (url.url || url),
						tooltip: url.tooltip || key
					};

					emoticons[idx][key] = url;
				}

				// Preload the emoticon
				preLoadCache.push(dom.createElement('img', {
					src: url.url || url
				}));
			});
		});
	};

	/**
	 * Autofocus the editor
	 * @private
	 */
	autofocus = function () {
		var	range, txtPos,
			node     = wysiwygBody.firstChild,
			focusEnd = !!options.autofocusEnd;

		// Can't focus invisible elements
		if (!dom.isVisible(editorContainer)) {
			return;
		}

		if (base.sourceMode()) {
			txtPos = focusEnd ? sourceEditor.value.length : 0;

			sourceEditor.setSelectionRange(txtPos, txtPos);

			return;
		}

		dom.removeWhiteSpace(wysiwygBody);

		if (focusEnd) {
			if (!(node = wysiwygBody.lastChild)) {
				node = dom.createElement('p', {}, wysiwygDoc);
				dom.appendChild(wysiwygBody, node);
			}

			while (node.lastChild) {
				node = node.lastChild;

				// IE < 11 should place the cursor after the <br> as
				// it will show it as a newline. IE >= 11 and all
				// other browsers should place the cursor before.
				if (!IE_BR_FIX && dom.is(node, 'br') && node.previousSibling) {
					node = node.previousSibling;
				}
			}
		}

		range = wysiwygDoc.createRange();

		if (!dom.canHaveChildren(node)) {
			range.setStartBefore(node);

			if (focusEnd) {
				range.setStartAfter(node);
			}
		} else {
			range.selectNodeContents(node);
		}

		range.collapse(!focusEnd);
		rangeHelper.selectRange(range);
		currentSelection = range;

		if (focusEnd) {
			wysiwygBody.scrollTop = wysiwygBody.scrollHeight;
		}

		base.focus();
	};

	/**
	 * Gets if the editor is read only
	 *
	 * @since 1.3.5
	 * @function
	 * @memberOf sceditor.prototype
	 * @name readOnly
	 * @return {boolean}
	 */
	/**
	 * Sets if the editor is read only
	 *
	 * @param {boolean} readOnly
	 * @since 1.3.5
	 * @function
	 * @memberOf sceditor.prototype
	 * @name readOnly^2
	 * @return {this}
	 */
	base.readOnly = function (readOnly) {
		if (typeof readOnly !== 'boolean') {
			return !sourceEditor.readonly;
		}

		wysiwygBody.contentEditable = !readOnly;
		sourceEditor.readonly = !readOnly;

		updateToolBar(readOnly);

		return base;
	};

	/**
	 * Gets if the editor is in RTL mode
	 *
	 * @since 1.4.1
	 * @function
	 * @memberOf sceditor.prototype
	 * @name rtl
	 * @return {Boolean}
	 */
	/**
	 * Sets if the editor is in RTL mode
	 *
	 * @param {boolean} rtl
	 * @since 1.4.1
	 * @function
	 * @memberOf sceditor.prototype
	 * @name rtl^2
	 * @return {this}
	 */
	base.rtl = function (rtl) {
		var dir = rtl ? 'rtl' : 'ltr';

		if (typeof rtl !== 'boolean') {
			return dom.attr(sourceEditor, 'dir') === 'rtl';
		}

		dom.attr(wysiwygBody, 'dir', dir);
		dom.attr(sourceEditor, 'dir', dir);

		dom.removeClass(editorContainer, 'rtl');
		dom.removeClass(editorContainer, 'ltr');
		dom.addClass(editorContainer, dir);

		return base;
	};

	/**
	 * Updates the toolbar to disable/enable the appropriate buttons
	 * @private
	 */
	updateToolBar = function (disable) {
		var mode = base.inSourceMode() ? '_sceTxtMode' : '_sceWysiwygMode';

		utils.each(toolbarButtons, function (_, button) {
			disable = disable || !button[mode];

			dom.toggleClass(button, 'disabled', disable);
		});
	};

	/**
	 * Gets the width of the editor in pixels
	 *
	 * @since 1.3.5
	 * @function
	 * @memberOf sceditor.prototype
	 * @name width
	 * @return {int}
	 */
	/**
	 * Sets the width of the editor
	 *
	 * @param {int} width Width in pixels
	 * @since 1.3.5
	 * @function
	 * @memberOf sceditor.prototype
	 * @name width^2
	 * @return {this}
	 */
	/**
	 * Sets the width of the editor
	 *
	 * The saveWidth specifies if to save the width. The stored width can be
	 * used for things like restoring from maximized state.
	 *
	 * @param {int}     width            Width in pixels
	 * @param {boolean}	[saveWidth=true] If to store the width
	 * @since 1.4.1
	 * @function
	 * @memberOf sceditor.prototype
	 * @name width^3
	 * @return {this}
	 */
	base.width = function (width, saveWidth) {
		if (!width && width !== 0) {
			return dom.width(editorContainer);
		}

		base.dimensions(width, null, saveWidth);

		return base;
	};

	/**
	 * Returns an object with the properties width and height
	 * which are the width and height of the editor in px.
	 *
	 * @since 1.4.1
	 * @function
	 * @memberOf sceditor.prototype
	 * @name dimensions
	 * @return {object}
	 */
	/**
	 * <p>Sets the width and/or height of the editor.</p>
	 *
	 * <p>If width or height is not numeric it is ignored.</p>
	 *
	 * @param {int}	width	Width in px
	 * @param {int}	height	Height in px
	 * @since 1.4.1
	 * @function
	 * @memberOf sceditor.prototype
	 * @name dimensions^2
	 * @return {this}
	 */
	/**
	 * <p>Sets the width and/or height of the editor.</p>
	 *
	 * <p>If width or height is not numeric it is ignored.</p>
	 *
	 * <p>The save argument specifies if to save the new sizes.
	 * The saved sizes can be used for things like restoring from
	 * maximized state. This should normally be left as true.</p>
	 *
	 * @param {int}		width		Width in px
	 * @param {int}		height		Height in px
	 * @param {boolean}	[save=true]	If to store the new sizes
	 * @since 1.4.1
	 * @function
	 * @memberOf sceditor.prototype
	 * @name dimensions^3
	 * @return {this}
	 */
	base.dimensions = function (width, height, save) {
		// set undefined width/height to boolean false
		width  = (!width && width !== 0) ? false : width;
		height = (!height && height !== 0) ? false : height;

		if (width === false && height === false) {
			return { width: base.width(), height: base.height() };
		}

		if (width !== false) {
			if (save !== false) {
				options.width = width;
			}

			dom.width(editorContainer, width);
		}

		if (height !== false) {
			if (save !== false) {
				options.height = height;
			}

			dom.height(editorContainer, height);
		}

		return base;
	};

	/**
	 * Updates the CSS styles cache.
	 *
	 * This shouldn't be needed unless changing the editors theme.
	 *
	 * @since 1.4.1
	 * @function
	 * @memberOf sceditor.prototype
	 * @name updateStyleCache
	 * @return {int}
	 * @deprecated
	 */
	base.updateStyleCache = function () {};

	/**
	 * Gets the height of the editor in px
	 *
	 * @since 1.3.5
	 * @function
	 * @memberOf sceditor.prototype
	 * @name height
	 * @return {int}
	 */
	/**
	 * Sets the height of the editor
	 *
	 * @param {int} height Height in px
	 * @since 1.3.5
	 * @function
	 * @memberOf sceditor.prototype
	 * @name height^2
	 * @return {this}
	 */
	/**
	 * Sets the height of the editor
	 *
	 * The saveHeight specifies if to save the height.
	 *
	 * The stored height can be used for things like
	 * restoring from maximized state.
	 *
	 * @param {int} height Height in px
	 * @param {boolean} [saveHeight=true] If to store the height
	 * @since 1.4.1
	 * @function
	 * @memberOf sceditor.prototype
	 * @name height^3
	 * @return {this}
	 */
	base.height = function (height, saveHeight) {
		if (!height && height !== 0) {
			return dom.height(editorContainer);
		}

		base.dimensions(null, height, saveHeight);

		return base;
	};

	/**
	 * Gets if the editor is maximised or not
	 *
	 * @since 1.4.1
	 * @function
	 * @memberOf sceditor.prototype
	 * @name maximize
	 * @return {boolean}
	 */
	/**
	 * Sets if the editor is maximised or not
	 *
	 * @param {boolean} maximize If to maximise the editor
	 * @since 1.4.1
	 * @function
	 * @memberOf sceditor.prototype
	 * @name maximize^2
	 * @return {this}
	 */
	base.maximize = function (maximize) {
		var maximizeSize = 'sceditor-maximize';

		if (utils.isUndefined(maximize)) {
			return dom.hasClass(editorContainer, maximizeSize);
		}

		maximize = !!maximize;

		if (maximize) {
			maximizeScrollPosiotion = globalWin.scrollTop;
		}

		dom.toggleClass(globalDoc.documentElement, maximizeSize, maximize);
		dom.toggleClass(globalDoc.body, maximizeSize, maximize);
		dom.toggleClass(editorContainer, maximizeSize, maximize);
		base.width(maximize ? '100%' : options.width, false);
		base.height(maximize ? '100%' : options.height, false);

		if (!maximize) {
			globalWin.scrollTop = maximizeScrollPosiotion;
		}

		autoExpand();

		return base;
	};

	autoExpand = function () {
		if (options.autoExpand && !autoExpandThrottle) {
			setTimeout(base.expandToContent, 200);
		}
	};

	/**
	 * Expands or shrinks the editors height to the height of it's content
	 *
	 * Unless ignoreMaxHeight is set to true it will not expand
	 * higher than the maxHeight option.
	 *
	 * @since 1.3.5
	 * @param {Boolean} [ignoreMaxHeight=false]
	 * @function
	 * @name expandToContent
	 * @memberOf sceditor.prototype
	 * @see #resizeToContent
	 */
	base.expandToContent = function (ignoreMaxHeight) {
		if (base.maximize()) {
			return;
		}

		autoExpandThrottle = false;

		if (!autoExpandBounds) {
			var height = options.resizeMinHeight || options.height ||
				dom.height(original);

			autoExpandBounds = {
				min: height,
				max: options.resizeMaxHeight || (height * 2)
			};
		}

		var range = globalDoc.createRange();
		range.selectNodeContents(wysiwygBody);

		var rect = range.getBoundingClientRect();
		var current = wysiwygDoc.documentElement.clientHeight;
		var spaceNeeded = rect.bottom - rect.top;
		var newHeight = base.height() + (spaceNeeded - current);

		if (!ignoreMaxHeight && autoExpandBounds.max !== -1) {
			newHeight = Math.min(newHeight, autoExpandBounds.max);
		}

		base.height(Math.ceil(Math.max(newHeight, autoExpandBounds.min)));
	};

	/**
	 * Destroys the editor, removing all elements and
	 * event handlers.
	 *
	 * Leaves only the original textarea.
	 *
	 * @function
	 * @name destroy
	 * @memberOf sceditor.prototype
	 */
	base.destroy = function () {
		// Don't destroy if the editor has already been destroyed
		if (!pluginManager) {
			return;
		}

		pluginManager.destroy();

		rangeHelper   = null;
		lastRange     = null;
		pluginManager = null;

		if (dropdown) {
			dom.remove(dropdown);
		}

		dom.off(globalDoc, 'click', handleDocumentClick);

		// TODO: make off support null nodes?
		var form = original.form;
		if (form) {
			dom.off(form, 'reset', handleFormReset);
			dom.off(form, 'submit', base.updateOriginal);
		}

		dom.remove(sourceEditor);
		dom.remove(toolbar);
		dom.remove(editorContainer);

		delete original._sceditor;
		dom.show(original);

		original.required = isRequired;
	};


	/**
	 * Creates a menu item drop down
	 *
	 * @param  {HTMLElement} menuItem The button to align the dropdown with
	 * @param  {string} name          Used for styling the dropdown, will be
	 *                                a class sceditor-name
	 * @param  {HTMLElement} content  The HTML content of the dropdown
	 * @param  {boolean} ieFix           If to add the unselectable attribute
	 *                                to all the contents elements. Stops
	 *                                IE from deselecting the text in the
	 *                                editor
	 * @function
	 * @name createDropDown
	 * @memberOf sceditor.prototype
	 */
	base.createDropDown = function (menuItem, name, content, ieFix) {
		// first click for create second click for close
		var	dropDownCss,
			dropDownClass = 'sceditor-' + name;

		// Will re-focus the editor. This is needed for IE
		// as it has special logic to save/restore the selection
		base.closeDropDown(true);

		// Only close the dropdown if it was already open
		if (dropdown && dom.hasClass(dropdown, dropDownClass)) {
			return;
		}

		// IE needs unselectable attr to stop it from
		// unselecting the text in the editor.
		// SCEditor can cope if IE does unselect the
		// text it's just not nice.
		if (ieFix !== false) {
			utils.each(dom.find(content, ':not(input):not(textarea)'),
				function (_, node) {
					if (node.nodeType === dom.ELEMENT_NODE) {
						dom.attr(node, 'unselectable', 'on');
					}
				});
		}

		dropDownCss = utils.extend({
			top: dom.getOffset(menuItem).top,
			left: dom.getOffset(menuItem).left,
			marginTop: menuItem.clientHeight
		}, options.dropDownCss);

		dropdown = dom.createElement('div', {
			className: 'sceditor-dropdown ' + dropDownClass
		});

		dom.css(dropdown, dropDownCss);
		dom.appendChild(dropdown, content);
		dom.appendChild(globalDoc.body, dropdown);
		dom.on(dropdown, 'click focusin', function (e) {
			// stop clicks within the dropdown from being handled
			e.stopPropagation();
		});

		// If try to focus the first input immediately IE will
		// place the cursor at the start of the editor instead
		// of focusing on the input.
		setTimeout(function () {
			if (dropdown) {
				var first = dom.find(dropdown, 'input,textarea')[0];
				if (first) {
					first.focus();
				}
			}
		});
	};

	/**
	 * Handles any document click and closes the dropdown if open
	 * @private
	 */
	handleDocumentClick = function (e) {
		// ignore right clicks
		if (e.which !== 3 && dropdown && !e.defaultPrevented) {
			autoUpdate();

			base.closeDropDown();
		}
	};

	/**
	 * Handles the WYSIWYG editors paste event
	 * @private
	 */
	handlePasteEvt = function (e) {
		var isIeOrEdge = IE_VER || browser.edge;
		var editable = wysiwygBody;
		var clipboard = e.clipboardData;
		var loadImage = function (file) {
			var reader = new FileReader();
			reader.onload = function (e) {
				handlePasteData({
					html: '<img src="' + e.target.result + '" />'
				});
			};
			reader.readAsDataURL(file);
		};

		// Modern browsers with clipboard API - everything other than _very_
		// old android web views and UC browseer which doesn't support the
		// paste event at all.
		if (clipboard && !isIeOrEdge) {
			var data = {};
			var types = clipboard.types;
			var items = clipboard.items;

			e.preventDefault();

			for (var i = 0; i < types.length; i++) {
				// Normalise image pasting to paste as a data-uri
				if (globalWin.FileReader && items &&
					IMAGE_MIME_REGEX.test(items[i].type)) {
					return loadImage(clipboard.items[i].getAsFile());
				}

				data[types[i]] = clipboard.getData(types[i]);
			}
			// Call plugins here with file?
			data.text = data['text/plain'];
			data.html = data['text/html'];

			handlePasteData(data);
		// If contentsFragment exists then we are already waiting for a
		// previous paste so let the handler for that handle this one too
		} else if (!pasteContentFragment) {
			// Save the scroll position so can be restored
			// when contents is restored
			var scrollTop = editable.scrollTop;

			rangeHelper.saveRange();

			pasteContentFragment = globalDoc.createDocumentFragment();
			while (editable.firstChild) {
				dom.appendChild(pasteContentFragment, editable.firstChild);
			}

			setTimeout(function () {
				var html = editable.innerHTML;

				editable.innerHTML = '';
				dom.appendChild(editable, pasteContentFragment);
				editable.scrollTop = scrollTop;
				pasteContentFragment = false;

				rangeHelper.restoreRange();

				handlePasteData({ html: html });
			}, 0);
		}
	};

	/**
	 * Gets the pasted data, filters it and then inserts it.
	 * @param {Object} data
	 * @private
	 */
	handlePasteData = function (data) {
		var pastearea = dom.createElement('div', {}, wysiwygDoc);

		pluginManager.call('pasteRaw', data);

		if (data.html) {
			pastearea.innerHTML = data.html;

			// fix any invalid nesting
			dom.fixNesting(pastearea);
		} else {
			pastearea.innerHTML = escape.entities(data.text || '');
		}

		var paste = {
			val: pastearea.innerHTML
		};

		if (pluginManager.hasHandler('toSource')) {
			dom.appendChild(wysiwygBody, pastearea);
// TODO: replace this API at same time? for format as special
			paste.val = pluginManager
				.callOnlyFirst('toSource', paste.val, pastearea);

			dom.remove(pastearea);
		}

		pluginManager.call('paste', paste);

		if (pluginManager.hasHandler('toWysiwyg')) {
			paste.val = pluginManager
				.callOnlyFirst('toWysiwyg', paste.val, true);
		}

		pluginManager.call('pasteHtml', paste);

		base.wysiwygEditorInsertHtml(paste.val, null, true);
	};

	/**
	 * Closes any currently open drop down
	 *
	 * @param {boolean} [focus=false] If to focus the editor
	 *                             after closing the drop down
	 * @function
	 * @name closeDropDown
	 * @memberOf sceditor.prototype
	 */
	base.closeDropDown = function (focus) {
		if (dropdown) {
			dom.remove(dropdown);
			dropdown = null;
		}

		if (focus === true) {
			base.focus();
		}
	};

	/**
	 * Gets the WYSIWYG editors document
	 * @private
	 */
	getWysiwygDoc = function () {
		if (wysiwygEditor.contentDocument) {
			return wysiwygEditor.contentDocument;
		}

		if (wysiwygEditor.contentWindow &&
			wysiwygEditor.contentWindow.document) {
			return wysiwygEditor.contentWindow.document;
		}

		return wysiwygEditor.document;
	};


	/**
	 * <p>Inserts HTML into WYSIWYG editor.</p>
	 *
	 * <p>If endHtml is specified, any selected text will be placed
	 * between html and endHtml. If there is no selected text html
	 * and endHtml will just be concatenate together.</p>
	 *
	 * @param {string} html
	 * @param {string} [endHtml=null]
	 * @param {boolean} [overrideCodeBlocking=false] If to insert the html
	 *                                               into code tags, by
	 *                                               default code tags only
	 *                                               support text.
	 * @function
	 * @name wysiwygEditorInsertHtml
	 * @memberOf sceditor.prototype
	 */
	base.wysiwygEditorInsertHtml = function (
		html, endHtml, overrideCodeBlocking
	) {
		var	marker, scrollTop, scrollTo,
			editorHeight = dom.height(wysiwygEditor);

		base.focus();

// TODO: This code tag should be configurable and
// should maybe convert the HTML into text instead
		// Don't apply to code elements
		if (!overrideCodeBlocking && dom.closest(currentBlockNode, 'code')) {
			return;
		}

		// Insert the HTML and save the range so the editor can be scrolled
		// to the end of the selection. Also allows emoticons to be replaced
		// without affecting the cursor position
		rangeHelper.insertHTML(html, endHtml);
		rangeHelper.saveRange();
		replaceEmoticons(wysiwygBody);

		// Scroll the editor after the end of the selection
		marker   = dom.find(wysiwygBody, '#sceditor-end-marker')[0];
		dom.show(marker);
		scrollTop = wysiwygBody.scrollTop;
		scrollTo  = (dom.getOffset(marker).top +
			(marker.offsetHeight * 1.5)) - editorHeight;
		dom.hide(marker);

		// Only scroll if marker isn't already visible
		if (scrollTo > scrollTop || scrollTo + editorHeight < scrollTop) {
			wysiwygBody.scrollTop = scrollTo;
		}

		triggerValueChanged(false);
		rangeHelper.restoreRange();

		// Add a new line after the last block element
		// so can always add text after it
		appendNewLine();
	};

	/**
	 * Like wysiwygEditorInsertHtml except it will convert any HTML
	 * into text before inserting it.
	 *
	 * @param {String} text
	 * @param {String} [endText=null]
	 * @function
	 * @name wysiwygEditorInsertText
	 * @memberOf sceditor.prototype
	 */
	base.wysiwygEditorInsertText = function (text, endText) {
		base.wysiwygEditorInsertHtml(
			escape.entities(text), escape.entities(endText)
		);
	};

	/**
	 * Inserts text into the WYSIWYG or source editor depending on which
	 * mode the editor is in.
	 *
	 * If endText is specified any selected text will be placed between
	 * text and endText. If no text is selected text and endText will
	 * just be concatenate together.
	 *
	 * @param {String} text
	 * @param {String} [endText=null]
	 * @since 1.3.5
	 * @function
	 * @name insertText
	 * @memberOf sceditor.prototype
	 */
	base.insertText = function (text, endText) {
		if (base.inSourceMode()) {
			base.sourceEditorInsertText(text, endText);
		} else {
			base.wysiwygEditorInsertText(text, endText);
		}

		return base;
	};

	/**
	 * Like wysiwygEditorInsertHtml but inserts text into the
	 * source mode editor instead.
	 *
	 * If endText is specified any selected text will be placed between
	 * text and endText. If no text is selected text and endText will
	 * just be concatenate together.
	 *
	 * The cursor will be placed after the text param. If endText is
	 * specified the cursor will be placed before endText, so passing:<br />
	 *
	 * '[b]', '[/b]'
	 *
	 * Would cause the cursor to be placed:<br />
	 *
	 * [b]Selected text|[/b]
	 *
	 * @param {String} text
	 * @param {String} [endText=null]
	 * @since 1.4.0
	 * @function
	 * @name sourceEditorInsertText
	 * @memberOf sceditor.prototype
	 */
	base.sourceEditorInsertText = function (text, endText) {
		var scrollTop, currentValue,
			startPos = sourceEditor.selectionStart,
			endPos   = sourceEditor.selectionEnd;

		scrollTop = sourceEditor.scrollTop;
		sourceEditor.focus();
		currentValue = sourceEditor.value;

		if (endText) {
			text += currentValue.substring(startPos, endPos) + endText;
		}

		sourceEditor.value = currentValue.substring(0, startPos) +
			text +
			currentValue.substring(endPos, currentValue.length);

		sourceEditor.selectionStart = (startPos + text.length) -
			(endText ? endText.length : 0);
		sourceEditor.selectionEnd = sourceEditor.selectionStart;

		sourceEditor.scrollTop = scrollTop;
		sourceEditor.focus();

		triggerValueChanged();
	};

	/**
	 * Gets the current instance of the rangeHelper class
	 * for the editor.
	 *
	 * @return sceditor.rangeHelper
	 * @function
	 * @name getRangeHelper
	 * @memberOf sceditor.prototype
	 */
	base.getRangeHelper = function () {
		return rangeHelper;
	};

	/**
	 * Gets or sets the source editor caret position.
	 *
	 * @param {Object} [position]
	 * @return {this}
	 * @function
	 * @since 1.4.5
	 * @name sourceEditorCaret
	 * @memberOf sceditor.prototype
	 */
	base.sourceEditorCaret = function (position) {
		var ret = {};

		sourceEditor.focus();

		if (position) {
			sourceEditor.selectionStart = position.start;
			sourceEditor.selectionEnd   = position.end;
		} else {
			ret.start = sourceEditor.selectionStart;
			ret.end   = sourceEditor.selectionEnd;
		}

		return position ? this : ret;
	};

	/**
	 * Gets the value of the editor.
	 *
	 * If the editor is in WYSIWYG mode it will return the filtered
	 * HTML from it (converted to BBCode if using the BBCode plugin).
	 * It it's in Source Mode it will return the unfiltered contents
	 * of the source editor (if using the BBCode plugin this will be
	 * BBCode again).
	 *
	 * @since 1.3.5
	 * @return {string}
	 * @function
	 * @name val
	 * @memberOf sceditor.prototype
	 */
	/**
	 * <p>Sets the value of the editor.</p>
	 *
	 * <p>If filter set true the val will be passed through the filter
	 * function. If using the BBCode plugin it will pass the val to
	 * the BBCode filter to convert any BBCode into HTML.</p>
	 *
	 * @param {String} val
	 * @param {Boolean} [filter=true]
	 * @return {this}
	 * @since 1.3.5
	 * @function
	 * @name val^2
	 * @memberOf sceditor.prototype
	 */
	base.val = function (val, filter) {
		if (!utils.isString(val)) {
			return base.inSourceMode() ?
				base.getSourceEditorValue(false) :
				base.getWysiwygEditorValue(filter);
		}

		if (!base.inSourceMode()) {
			if (filter !== false &&
				pluginManager.hasHandler('toWysiwyg')) {
				val = pluginManager.callOnlyFirst('toWysiwyg', val);
			}

			base.setWysiwygEditorValue(val);
		} else {
			base.setSourceEditorValue(val);
		}

		return base;
	};

	/**
	 * Inserts HTML/BBCode into the editor
	 *
	 * If end is supplied any selected text will be placed between
	 * start and end. If there is no selected text start and end
	 * will be concatenate together.
	 *
	 * If the filter param is set to true, the HTML/BBCode will be
	 * passed through any plugin filters. If using the BBCode plugin
	 * this will convert any BBCode into HTML.
	 *
	 * @param {String} start
	 * @param {String} [end=null]
	 * @param {Boolean} [filter=true]
	 * @param {Boolean} [convertEmoticons=true] If to convert emoticons
	 * @return {this}
	 * @since 1.3.5
	 * @function
	 * @name insert
	 * @memberOf sceditor.prototype
	 */
	/**
	 * Inserts HTML/BBCode into the editor
	 *
	 * If end is supplied any selected text will be placed between
	 * start and end. If there is no selected text start and end
	 * will be concatenate together.
	 *
	 * If the filter param is set to true, the HTML/BBCode will be
	 * passed through any plugin filters. If using the BBCode plugin
	 * this will convert any BBCode into HTML.
	 *
	 * If the allowMixed param is set to true, HTML any will not be
	 * escaped
	 *
	 * @param {String} start
	 * @param {String} [end=null]
	 * @param {Boolean} [filter=true]
	 * @param {Boolean} [convertEmoticons=true] If to convert emoticons
	 * @param {Boolean} [allowMixed=false]
	 * @return {this}
	 * @since 1.4.3
	 * @function
	 * @name insert^2
	 * @memberOf sceditor.prototype
	 */
	// eslint-disable-next-line max-params
	base.insert = function (
		start, end, filter, convertEmoticons, allowMixed
	) {
		if (base.inSourceMode()) {
			base.sourceEditorInsertText(start, end);
			return base;
		}

		// Add the selection between start and end
		if (end) {
			var	html = rangeHelper.selectedHtml();
			var div  = dom.createElement('div');

			dom.appendChild(wysiwygBody, div);
			dom.hide(div);
			div.innerHTML = html;

			if (filter !== false && pluginManager.hasHandler('toSource')) {
				html = pluginManager.callOnlyFirst('toSource', html, div);
			}

			dom.remove(div);

			start += html + end;
		}
// TODO: This filter should allow empty tags as it's inserting.
		if (filter !== false && pluginManager.hasHandler('toWysiwyg')) {
			start = pluginManager.callOnlyFirst('toWysiwyg', start, true);
		}

		// Convert any escaped HTML back into HTML if mixed is allowed
		if (filter !== false && allowMixed === true) {
			start = start.replace(/&lt;/g, '<')
				.replace(/&gt;/g, '>')
				.replace(/&amp;/g, '&');
		}

		base.wysiwygEditorInsertHtml(start);

		return base;
	};

	/**
	 * Gets the WYSIWYG editors HTML value.
	 *
	 * If using a plugin that filters the Ht Ml like the BBCode plugin
	 * it will return the result of the filtering (BBCode) unless the
	 * filter param is set to false.
	 *
	 * @param {boolean} [filter=true]
	 * @return {string}
	 * @function
	 * @name getWysiwygEditorValue
	 * @memberOf sceditor.prototype
	 */
	base.getWysiwygEditorValue = function (filter) {
		var	html;
		// Create a tmp node to store contents so it can be modified
		// without affecting anything else.
		var tmp = dom.createElement('div', {}, wysiwygDoc);
		var childNodes = wysiwygBody.childNodes;

		for (var i = 0; i < childNodes.length; i++) {
			dom.appendChild(tmp, childNodes[i].cloneNode(true));
		}

		dom.appendChild(wysiwygBody, tmp);
		dom.fixNesting(tmp);

		html = tmp.innerHTML;

		// filter the HTML and DOM through any plugins
		if (filter !== false && pluginManager.hasHandler('toSource')) {
			html = pluginManager.callOnlyFirst('toSource', html, tmp);
		}

		dom.remove(tmp);

		return html;
	};

	/**
	 * Gets the WYSIWYG editor's iFrame Body.
	 *
	 * @return {HTMLElement}
	 * @function
	 * @since 1.4.3
	 * @name getBody
	 * @memberOf sceditor.prototype
	 */
	base.getBody = function () {
		return wysiwygBody;
	};

	/**
	 * Gets the WYSIWYG editors container area (whole iFrame).
	 *
	 * @return {HTMLElement}
	 * @function
	 * @since 1.4.3
	 * @name getContentAreaContainer
	 * @memberOf sceditor.prototype
	 */
	base.getContentAreaContainer = function () {
		return wysiwygEditor;
	};

	/**
	 * Gets the text editor value
	 *
	 * If using a plugin that filters the text like the BBCode plugin
	 * it will return the result of the filtering which is BBCode to
	 * HTML so it will return HTML. If filter is set to false it will
	 * just return the contents of the source editor (BBCode).
	 *
	 * @param {boolean} [filter=true]
	 * @return {string}
	 * @function
	 * @since 1.4.0
	 * @name getSourceEditorValue
	 * @memberOf sceditor.prototype
	 */
	base.getSourceEditorValue = function (filter) {
		var val = sourceEditor.value;

		if (filter !== false && pluginManager.hasHandler('toWysiwyg')) {
			val = pluginManager.callOnlyFirst('toWysiwyg', val);
		}

		return val;
	};

	/**
	 * Sets the WYSIWYG HTML editor value. Should only be the HTML
	 * contained within the body tags
	 *
	 * @param {string} value
	 * @function
	 * @name setWysiwygEditorValue
	 * @memberOf sceditor.prototype
	 */
	base.setWysiwygEditorValue = function (value) {
		if (!value) {
			value = '<p>' + (IE_VER ? '' : '<br />') + '</p>';
		}

		wysiwygBody.innerHTML = value;
		replaceEmoticons(wysiwygBody);

		appendNewLine();
		triggerValueChanged();
		autoExpand();
	};

	/**
	 * Sets the text editor value
	 *
	 * @param {string} value
	 * @function
	 * @name setSourceEditorValue
	 * @memberOf sceditor.prototype
	 */
	base.setSourceEditorValue = function (value) {
		sourceEditor.value = value;

		triggerValueChanged();
	};

	/**
	 * Updates the textarea that the editor is replacing
	 * with the value currently inside the editor.
	 *
	 * @function
	 * @name updateOriginal
	 * @since 1.4.0
	 * @memberOf sceditor.prototype
	 */
	base.updateOriginal = function () {
		original.value = base.val();
	};

	/**
	 * Replaces any emoticon codes in the passed HTML
	 * with their emoticon images
	 * @private
	 */
	replaceEmoticons = function (node) {
// TODO: Make this tag configurable.
		if (!options.emoticonsEnabled || dom.parent(node, 'code')) {
			return;
		}

		var	doc           = node.ownerDocument,
			whitespace    = '\\s|\xA0|\u2002|\u2003|\u2009|&nbsp;',
			emoticonCodes = [],
			emoticonRegex = {},
			emoticons     = utils.extend(
				{},
				options.emoticons.more,
				options.emoticons.dropdown,
				options.emoticons.hidden
			);
// TODO: cache the emoticonCodes and emoticonCodes objects and share them with
// the AYT converstion

		utils.each(emoticons, function (key) {
			if (options.emoticonsCompat) {
				emoticonRegex[key] = new RegExp(
					'(>|^|' + whitespace + ')' +
					escape.regex(key) +
					'($|<|' + whitespace + ')'
				);
			}

			emoticonCodes.push(key);
		});

		// Sort keys shortest to longest (so can replace in reverse loop)
		emoticonCodes.sort(function (a, b) {
			return a.length - b.length;
		});

// TODO: tidy below
		var convertEmoticons = function (node) {
			node = node.firstChild;

			while (node) {
				var	parts, key, emoticon, parsedHtml,
					emoticonIdx, nextSibling, matchPos,
					nodeParent  = node.parentNode,
					nodeValue   = node.nodeValue;

				if (node.nodeType !== dom.TEXT_NODE) {
// TODO: Make this tag configurable.
					if (!dom.is(node, 'code')) {
						convertEmoticons(node);
					}
				} else if (nodeValue) {
					emoticonIdx = emoticonCodes.length;
					while (emoticonIdx--) {
						key      = emoticonCodes[emoticonIdx];
						matchPos = options.emoticonsCompat ?
							nodeValue.search(emoticonRegex[key]) :
							nodeValue.indexOf(key);

						if (matchPos > -1) {
							nextSibling    = node.nextSibling;
							emoticon       = emoticons[key];
							parts          = nodeValue
								.substr(matchPos).split(key);
							nodeValue      = nodeValue
								.substr(0, matchPos) + parts.shift();
							node.nodeValue = nodeValue;

							parsedHtml = dom.parseHTML(_tmpl('emoticon', {
								key: key,
								url: emoticon.url || emoticon,
								tooltip: emoticon.tooltip || key
							}), doc);

							nodeParent.insertBefore(
								parsedHtml,
								nextSibling
							);

							nodeParent.insertBefore(
								doc.createTextNode(parts.join(key)),
								nextSibling
							);
						}
					}
				}

				node = node.nextSibling;
			}
		};

		convertEmoticons(node);

		if (options.emoticonsCompat) {
			currentEmoticons = dom.find(wysiwygBody, EMOTICONS_SELECTOR);
		}
	};

	/**
	 * If the editor is in source code mode
	 *
	 * @return {boolean}
	 * @function
	 * @name inSourceMode
	 * @memberOf sceditor.prototype
	 */
	base.inSourceMode = function () {
		return dom.hasClass(editorContainer, 'sourceMode');
	};

	/**
	 * Gets if the editor is in sourceMode
	 *
	 * @return boolean
	 * @function
	 * @name sourceMode
	 * @memberOf sceditor.prototype
	 */
	/**
	 * Sets if the editor is in sourceMode
	 *
	 * @param {boolean} enable
	 * @return {this}
	 * @function
	 * @name sourceMode^2
	 * @memberOf sceditor.prototype
	 */
	base.sourceMode = function (enable) {
		var inSourceMode = base.inSourceMode();

		if (typeof enable !== 'boolean') {
			return inSourceMode;
		}

		if ((inSourceMode && !enable) || (!inSourceMode && enable)) {
			base.toggleSourceMode();
		}

		return base;
	};

	/**
	 * Switches between the WYSIWYG and source modes
	 *
	 * @function
	 * @name toggleSourceMode
	 * @since 1.4.0
	 * @memberOf sceditor.prototype
	 */
	base.toggleSourceMode = function () {
		var isInSourceMode = base.inSourceMode();

		// don't allow switching to WYSIWYG if doesn't support it
		if (!browser.isWysiwygSupported && isInSourceMode) {
			return;
		}

		if (!isInSourceMode) {
			rangeHelper.saveRange();
			rangeHelper.clear();
		}

		base.blur();

		if (isInSourceMode) {
			base.setWysiwygEditorValue(base.getSourceEditorValue());
		} else {
			base.setSourceEditorValue(base.getWysiwygEditorValue());
		}

		lastRange = null;
		dom.toggle(sourceEditor);

		// Fixes IE9 unspecified error. Not sure why it
		// is being triggered but this fixes it.
		if (!isInSourceMode) {
			sourceEditor.focus();
		}

		dom.toggle(wysiwygEditor);

		// Undo the previous IE 9 fix
		if (!isInSourceMode) {
			sourceEditor.blur();
		}

		dom.toggleClass(editorContainer, 'wysiwygMode', isInSourceMode);
		dom.toggleClass(editorContainer, 'sourceMode', !isInSourceMode);

		updateToolBar();
		updateActiveButtons();
	};

	/**
	 * Gets the selected text of the source editor
	 * @return {String}
	 * @private
	 */
	sourceEditorSelectedText = function () {
		sourceEditor.focus();

		return sourceEditor.value.substring(
			sourceEditor.selectionStart,
			sourceEditor.selectionEnd
		);
	};

	/**
	 * Handles the passed command
	 * @private
	 */
	handleCommand = function (caller, cmd) {
		// check if in text mode and handle text commands
		if (base.inSourceMode()) {
			if (cmd.txtExec) {
				if (Array.isArray(cmd.txtExec)) {
					base.sourceEditorInsertText.apply(base, cmd.txtExec);
				} else {
					cmd.txtExec.call(base, caller, sourceEditorSelectedText());
				}
			}
		} else if (cmd.exec) {
			if (utils.isFunction(cmd.exec)) {
				cmd.exec.call(base, caller);
			} else {
				base.execCommand(
					cmd.exec,
					cmd.hasOwnProperty('execParam') ? cmd.execParam : null
				);
			}
		}

	};

	/**
	 * Saves the current range. Needed for IE because it forgets
	 * where the cursor was and what was selected
	 * @private
	 */
	saveRange = function () {
		/* this is only needed for IE */
		if (IE_VER) {
			lastRange = rangeHelper.selectedRange();
		}
	};

	/**
	 * Executes a command on the WYSIWYG editor
	 *
	 * @param {String} command
	 * @param {String|Boolean} [param]
	 * @function
	 * @name execCommand
	 * @memberOf sceditor.prototype
	 */
	base.execCommand = function (command, param) {
		var	executed    = false,
			commandObj  = base.commands[command];

		base.focus();

// TODO: make configurable
		// don't apply any commands to code elements
		if (dom.closest(rangeHelper.parentNode(), 'code')) {
			return;
		}

		try {
			executed = wysiwygDoc.execCommand(command, false, param);
		} catch (ex) { }

		// show error if execution failed and an error message exists
		if (!executed && commandObj && commandObj.errorMessage) {
			/*global alert:false*/
			alert(base._(commandObj.errorMessage));
		}

		updateActiveButtons();
	};

	/**
	 * Checks if the current selection has changed and triggers
	 * the selectionchanged event if it has.
	 *
	 * In browsers other than IE, it will check at most once every 100ms.
	 * This is because only IE has a selection changed event.
	 * @private
	 */
	checkSelectionChanged = function () {
		function check() {
			// rangeHelper could be null if editor was destroyed
			// before the timeout had finished
			if (rangeHelper && !rangeHelper.compare(currentSelection)) {
				currentSelection = rangeHelper.cloneSelected();
				dom.trigger(editorContainer, 'selectionchanged');
			}

			isSelectionCheckPending = false;
		}

		if (isSelectionCheckPending) {
			return;
		}

		isSelectionCheckPending = true;

		// In IE, this is only called on the selectionchange event so no
		// need to limit checking as it should always be valid to do.
		if (IE_VER) {
			check();
		} else {
			setTimeout(check, 100);
		}
	};

	/**
	 * Checks if the current node has changed and triggers
	 * the nodechanged event if it has
	 * @private
	 */
	checkNodeChanged = function () {
		// check if node has changed
		var	oldNode,
			node = rangeHelper.parentNode();

		if (currentNode !== node) {
			oldNode          = currentNode;
			currentNode      = node;
			currentBlockNode = rangeHelper.getFirstBlockParent(node);

			dom.trigger(editorContainer, 'nodechanged', {
				oldNode: oldNode,
				newNode: currentNode
			});
		}
	};

	/**
	 * Gets the current node that contains the selection/caret in
	 * WYSIWYG mode.
	 *
	 * Will be null in sourceMode or if there is no selection.
	 *
	 * @return {?Node}
	 * @function
	 * @name currentNode
	 * @memberOf sceditor.prototype
	 */
	base.currentNode = function () {
		return currentNode;
	};

	/**
	 * Gets the first block level node that contains the
	 * selection/caret in WYSIWYG mode.
	 *
	 * Will be null in sourceMode or if there is no selection.
	 *
	 * @return {?Node}
	 * @function
	 * @name currentBlockNode
	 * @memberOf sceditor.prototype
	 * @since 1.4.4
	 */
	base.currentBlockNode = function () {
		return currentBlockNode;
	};

	/**
	 * Updates if buttons are active or not
	 * @private
	 */
	updateActiveButtons = function () {
		var firstBlock, parent;
		var activeClass = 'active';
		var doc         = wysiwygDoc;
		var isSource    = base.sourceMode();

		if (base.readOnly()) {
			utils.each(dom.find(toolbar, activeClass), function (_, menuItem) {
				dom.removeClass(menuItem, activeClass);
			});
			return;
		}

		if (!isSource) {
			parent     = rangeHelper.parentNode();
			firstBlock = rangeHelper.getFirstBlockParent(parent);
		}

		for (var j = 0; j < btnStateHandlers.length; j++) {
			var state      = 0;
			var btn        = toolbarButtons[btnStateHandlers[j].name];
			var stateFn    = btnStateHandlers[j].state;
			var isDisabled = (isSource && !btn._sceTxtMode) ||
						(!isSource && !btn._sceWysiwygMode);

			if (utils.isString(stateFn)) {
				if (!isSource) {
					try {
						state = doc.queryCommandEnabled(stateFn) ? 0 : -1;

						// eslint-disable-next-line max-depth
						if (state > -1) {
							state = doc.queryCommandState(stateFn) ? 1 : 0;
						}
					} catch (ex) {}
				}
			} else if (!isDisabled) {
				state = stateFn.call(base, parent, firstBlock);
			}

			dom.toggleClass(btn, 'disabled', isDisabled || state < 0);
			dom.toggleClass(btn, activeClass, state > 0);
		}
	};

	/**
	 * Handles any key press in the WYSIWYG editor
	 *
	 * @private
	 */
	handleKeyPress = function (e) {
		var	closestTag, br, brParent, lastChild;

// TODO: improve this so isn't set list, probably should just use
// dom.hasStyling to all block parents and if one does insert a br
		var DUPLICATED_TAGS = 'code,blockquote,pre';
		var LIST_TAGS = 'li,ul,ol';

		// FF bug: https://bugzilla.mozilla.org/show_bug.cgi?id=501496
		if (e.defaultPrevented) {
			return;
		}

		base.closeDropDown();

		closestTag = dom.closest(
			currentBlockNode, DUPLICATED_TAGS + ',' + LIST_TAGS);

		// "Fix" (OK it's a cludge) for blocklevel elements being
		// duplicated in some browsers when enter is pressed instead
		// of inserting a newline
		if (e.which === 13 && closestTag && !dom.is(closestTag, LIST_TAGS)) {
			lastRange = null;

			br = dom.createElement('br', {}, wysiwygDoc);
			rangeHelper.insertNode(br);

			// Last <br> of a block will be collapsed unless it is
			// IE < 11 so need to make sure the <br> that was inserted
			// isn't the last node of a block.
			if (!IE_BR_FIX) {
				brParent  = br.parentNode;
				lastChild = brParent.lastChild;

				// Sometimes an empty next node is created after the <br>
				if (lastChild && lastChild.nodeType === dom.TEXT_NODE &&
					lastChild.nodeValue === '') {
					dom.remove(lastChild);
					lastChild = brParent.lastChild;
				}

				// If this is the last BR of a block and the previous
				// sibling is inline then will need an extra BR. This
				// is needed because the last BR of a block will be
				// collapsed. Fixes issue #248
				if (!dom.isInline(brParent, true) && lastChild === br &&
					dom.isInline(br.previousSibling)) {
					rangeHelper.insertHTML('<br>');
				}
			}

			e.preventDefault();
		}
	};

	/**
	 * Makes sure that if there is a code or quote tag at the
	 * end of the editor, that there is a new line after it.
	 *
	 * If there wasn't a new line at the end you wouldn't be able
	 * to enter any text after a code/quote tag
	 * @return {void}
	 * @private
	 */
	appendNewLine = function () {
		var name, requiresNewLine, paragraph;

		dom.rTraverse(wysiwygBody, function (node) {
			name = node.nodeName.toLowerCase();
// TODO: Replace requireNewLineFix with just a block level fix for any
// block that has styling and any block that isn't a plain <p> or <div>
			if (newLineFixTags.indexOf(name) > -1) {
				requiresNewLine = true;
			}

// TODO: tidy this up
			// find the last non-empty text node or line break.
			if ((node.nodeType === 3 && !/^\s*$/.test(node.nodeValue)) ||
				name === 'br' || (IE_BR_FIX && !node.firstChild &&
				!dom.isInline(node, false))) {

				// this is the last text or br node, if its in a code or
				// quote tag then add a newline to the end of the editor
				if (requiresNewLine) {
					paragraph = dom.createElement('p', {}, wysiwygDoc);
					paragraph.className = 'sceditor-nlf';
					paragraph.innerHTML = !IE_BR_FIX ? '<br />' : '';
					dom.appendChild(wysiwygBody, paragraph);
				}

				return false;
			}
		});
	};

	/**
	 * Handles form reset event
	 * @private
	 */
	handleFormReset = function () {
		base.val(original.value);
	};

	/**
	 * Handles any mousedown press in the WYSIWYG editor
	 * @private
	 */
	handleMouseDown = function () {
		base.closeDropDown();
		lastRange = null;
	};

	/**
	 * Translates the string into the locale language.
	 *
	 * Replaces any {0}, {1}, {2}, ect. with the params provided.
	 *
	 * @param {string} str
	 * @param {...String} args
	 * @return {string}
	 * @function
	 * @name _
	 * @memberOf sceditor.prototype
	 */
	base._ = function () {
		var	undef,
			args = arguments;

		if (locale && locale[args[0]]) {
			args[0] = locale[args[0]];
		}

		return args[0].replace(/\{(\d+)\}/g, function (str, p1) {
			return args[p1 - 0 + 1] !== undef ?
				args[p1 - 0 + 1] :
				'{' + p1 + '}';
		});
	};

	/**
	 * Passes events on to any handlers
	 * @private
	 * @return void
	 */
	handleEvent = function (e) {
		// Send event to all plugins
		pluginManager.call(e.type + 'Event', e, base);

		// convert the event into a custom event to send
		var name = (e.target === sourceEditor ? 'scesrc' : 'scewys') + e.type;

		if (eventHandlers[name]) {
			eventHandlers[name].forEach(function (fn) {
				fn.call(base, e);
			});
		}
	};

	/**
	 * <p>Binds a handler to the specified events</p>
	 *
	 * <p>This function only binds to a limited list of
	 * supported events.<br />
	 * The supported events are:
	 * <ul>
	 *   <li>keyup</li>
	 *   <li>keydown</li>
	 *   <li>Keypress</li>
	 *   <li>blur</li>
	 *   <li>focus</li>
	 *   <li>nodechanged<br />
	 *       When the current node containing the selection changes
	 *       in WYSIWYG mode</li>
	 *   <li>contextmenu</li>
	 *   <li>selectionchanged</li>
	 *   <li>valuechanged</li>
	 * </ul>
	 * </p>
	 *
	 * <p>The events param should be a string containing the event(s)
	 * to bind this handler to. If multiple, they should be separated
	 * by spaces.</p>
	 *
	 * @param  {String} events
	 * @param  {Function} handler
	 * @param  {Boolean} excludeWysiwyg If to exclude adding this handler
	 *                                  to the WYSIWYG editor
	 * @param  {Boolean} excludeSource  if to exclude adding this handler
	 *                                  to the source editor
	 * @return {this}
	 * @function
	 * @name bind
	 * @memberOf sceditor.prototype
	 * @since 1.4.1
	 */
	base.bind = function (events, handler, excludeWysiwyg, excludeSource) {
		events = events.split(' ');

		var i  = events.length;
		while (i--) {
			if (utils.isFunction(handler)) {
				var wysEvent = 'scewys' + events[i];
				var srcEvent = 'scesrc' + events[i];
				// Use custom events to allow passing the instance as the
				// 2nd argument.
				// Also allows unbinding without unbinding the editors own
				// event handlers.
				if (!excludeWysiwyg) {
					eventHandlers[wysEvent] = eventHandlers[wysEvent] || [];
					eventHandlers[wysEvent].push(handler);
				}

				if (!excludeSource) {
					eventHandlers[srcEvent] = eventHandlers[srcEvent] || [];
					eventHandlers[srcEvent].push(handler);
				}

				// Start sending value changed events
				if (events[i] === 'valuechanged') {
					triggerValueChanged.hasHandler = true;
				}
			}
		}

		return base;
	};

	/**
	 * Unbinds an event that was bound using bind().
	 *
	 * @param  {String} events
	 * @param  {Function} handler
	 * @param  {Boolean} excludeWysiwyg If to exclude unbinding this
	 *                                  handler from the WYSIWYG editor
	 * @param  {Boolean} excludeSource  if to exclude unbinding this
	 *                                  handler from the source editor
	 * @return {this}
	 * @function
	 * @name unbind
	 * @memberOf sceditor.prototype
	 * @since 1.4.1
	 * @see bind
	 */
	base.unbind = function (
		events, handler, excludeWysiwyg, excludeSource
	) {
		events = events.split(' ');

		var i  = events.length;
		while (i--) {
			if (utils.isFunction(handler)) {
				if (!excludeWysiwyg) {
					utils.arrayRemove(
						eventHandlers['scewys' + events[i]] || [], handler);
				}

				if (!excludeSource) {
					utils.arrayRemove(
						eventHandlers['scesrc' + events[i]] || [], handler);
				}
			}
		}

		return base;
	};

	/**
	 * Blurs the editors input area
	 *
	 * @return {this}
	 * @function
	 * @name blur
	 * @memberOf sceditor.prototype
	 * @since 1.3.6
	 */
	/**
	 * Adds a handler to the editors blur event
	 *
	 * @param  {Function} handler
	 * @param  {Boolean} excludeWysiwyg If to exclude adding this handler
	 *                                  to the WYSIWYG editor
	 * @param  {Boolean} excludeSource  if to exclude adding this handler
	 *                                  to the source editor
	 * @return {this}
	 * @function
	 * @name blur^2
	 * @memberOf sceditor.prototype
	 * @since 1.4.1
	 */
	base.blur = function (handler, excludeWysiwyg, excludeSource) {
		if (utils.isFunction(handler)) {
			base.bind('blur', handler, excludeWysiwyg, excludeSource);
		} else if (!base.sourceMode()) {
			wysiwygBody.blur();
		} else {
			sourceEditor.blur();
		}

		return base;
	};

	/**
	 * Focuses the editors input area
	 *
	 * @return {this}
	 * @function
	 * @name focus
	 * @memberOf sceditor.prototype
	 */
	/**
	 * Adds an event handler to the focus event
	 *
	 * @param  {Function} handler
	 * @param  {Boolean} excludeWysiwyg If to exclude adding this handler
	 *                                  to the WYSIWYG editor
	 * @param  {Boolean} excludeSource  if to exclude adding this handler
	 *                                  to the source editor
	 * @return {this}
	 * @function
	 * @name focus^2
	 * @memberOf sceditor.prototype
	 * @since 1.4.1
	 */
	base.focus = function (handler, excludeWysiwyg, excludeSource) {
		if (utils.isFunction(handler)) {
			base.bind('focus', handler, excludeWysiwyg, excludeSource);
		} else if (!base.inSourceMode()) {
			// Already has focus so do nothing
			if (dom.find(wysiwygDoc, ':focus').length) {
				return;
			}

			var container,
				rng = rangeHelper.selectedRange();

			// Fix FF bug where it shows the cursor in the wrong place
			// if the editor hasn't had focus before. See issue #393
			if (!currentSelection && !rangeHelper.hasSelection()) {
				autofocus();
			}

			// Check if cursor is set after a BR when the BR is the only
			// child of the parent. In Firefox this causes a line break
			// to occur when something is typed. See issue #321
			if (!IE_BR_FIX && rng && rng.endOffset === 1 && rng.collapsed) {
				container = rng.endContainer;

				if (container && container.childNodes.length === 1 &&
					dom.is(container.firstChild, 'br')) {
					rng.setStartBefore(container.firstChild);
					rng.collapse(true);
					rangeHelper.selectRange(rng);
				}
			}

			wysiwygEditor.contentWindow.focus();
			wysiwygBody.focus();

			// Needed for IE < 9
			if (lastRange) {
				rangeHelper.selectRange(lastRange);

				// remove the stored range after being set.
				// If the editor loses focus it should be
				// saved again.
				lastRange = null;
			}
		} else {
			sourceEditor.focus();
		}

		updateActiveButtons();

		return base;
	};

	/**
	 * Adds a handler to the key down event
	 *
	 * @param  {Function} handler
	 * @param  {Boolean} excludeWysiwyg If to exclude adding this handler
	 *                                  to the WYSIWYG editor
	 * @param  {Boolean} excludeSource  If to exclude adding this handler
	 *                                  to the source editor
	 * @return {this}
	 * @function
	 * @name keyDown
	 * @memberOf sceditor.prototype
	 * @since 1.4.1
	 */
	base.keyDown = function (handler, excludeWysiwyg, excludeSource) {
		return base.bind('keydown', handler, excludeWysiwyg, excludeSource);
	};

	/**
	 * Adds a handler to the key press event
	 *
	 * @param  {Function} handler
	 * @param  {Boolean} excludeWysiwyg If to exclude adding this handler
	 *                                  to the WYSIWYG editor
	 * @param  {Boolean} excludeSource  If to exclude adding this handler
	 *                                  to the source editor
	 * @return {this}
	 * @function
	 * @name keyPress
	 * @memberOf sceditor.prototype
	 * @since 1.4.1
	 */
	base.keyPress = function (handler, excludeWysiwyg, excludeSource) {
		return base
			.bind('keypress', handler, excludeWysiwyg, excludeSource);
	};

	/**
	 * Adds a handler to the key up event
	 *
	 * @param  {Function} handler
	 * @param  {Boolean} excludeWysiwyg If to exclude adding this handler
	 *                                  to the WYSIWYG editor
	 * @param  {Boolean} excludeSource  If to exclude adding this handler
	 *                                  to the source editor
	 * @return {this}
	 * @function
	 * @name keyUp
	 * @memberOf sceditor.prototype
	 * @since 1.4.1
	 */
	base.keyUp = function (handler, excludeWysiwyg, excludeSource) {
		return base.bind('keyup', handler, excludeWysiwyg, excludeSource);
	};

	/**
	 * <p>Adds a handler to the node changed event.</p>
	 *
	 * <p>Happens whenever the node containing the selection/caret
	 * changes in WYSIWYG mode.</p>
	 *
	 * @param  {Function} handler
	 * @return {this}
	 * @function
	 * @name nodeChanged
	 * @memberOf sceditor.prototype
	 * @since 1.4.1
	 */
	base.nodeChanged = function (handler) {
		return base.bind('nodechanged', handler, false, true);
	};

	/**
	 * <p>Adds a handler to the selection changed event</p>
	 *
	 * <p>Happens whenever the selection changes in WYSIWYG mode.</p>
	 *
	 * @param  {Function} handler
	 * @return {this}
	 * @function
	 * @name selectionChanged
	 * @memberOf sceditor.prototype
	 * @since 1.4.1
	 */
	base.selectionChanged = function (handler) {
		return base.bind('selectionchanged', handler, false, true);
	};

	/**
	 * <p>Adds a handler to the value changed event</p>
	 *
	 * <p>Happens whenever the current editor value changes.</p>
	 *
	 * <p>Whenever anything is inserted, the value changed or
	 * 1.5 secs after text is typed. If a space is typed it will
	 * cause the event to be triggered immediately instead of
	 * after 1.5 seconds</p>
	 *
	 * @param  {Function} handler
	 * @param  {Boolean} excludeWysiwyg If to exclude adding this handler
	 *                                  to the WYSIWYG editor
	 * @param  {Boolean} excludeSource  If to exclude adding this handler
	 *                                  to the source editor
	 * @return {this}
	 * @function
	 * @name valueChanged
	 * @memberOf sceditor.prototype
	 * @since 1.4.5
	 */
	base.valueChanged = function (handler, excludeWysiwyg, excludeSource) {
		return base
			.bind('valuechanged', handler, excludeWysiwyg, excludeSource);
	};

	/**
	 * Emoticons keypress handler
	 * @private
	 */
	emoticonsKeyPress = function (e) {
		var	replacedEmoticon,
			cachePos       = 0,
			emoticonsCache = base.emoticonsCache,
			curChar        = String.fromCharCode(e.which);
// TODO: Make configurable
		if (dom.closest(currentBlockNode, 'code')) {
			return;
		}

		if (!emoticonsCache) {
			emoticonsCache = [];

			utils.each(utils.extend(
				{},
				options.emoticons.more,
				options.emoticons.dropdown,
				options.emoticons.hidden
			), function (key, url) {
				emoticonsCache[cachePos++] = [
					key,
					_tmpl('emoticon', {
						key: key,
						url: url.url || url,
						tooltip: url.tooltip || key
					})
				];
			});

			emoticonsCache.sort(function (a, b) {
				return a[0].length - b[0].length;
			});

			base.emoticonsCache = emoticonsCache;
			base.longestEmoticonCode =
				emoticonsCache[emoticonsCache.length - 1][0].length;
		}

		replacedEmoticon = rangeHelper.replaceKeyword(
			base.emoticonsCache,
			true,
			true,
			base.longestEmoticonCode,
			options.emoticonsCompat,
			curChar
		);

		if (replacedEmoticon && options.emoticonsCompat) {
			currentEmoticons = dom.find(wysiwygBody, EMOTICONS_SELECTOR);
			replacedEmoticon = /^\s$/.test(curChar);
		}

		if (replacedEmoticon) {
			e.preventDefault();
		}
	};

	/**
	 * Makes sure emoticons are surrounded by whitespace
	 * @private
	 */
	emoticonsCheckWhitespace = function () {
		if (!currentEmoticons.length) {
			return;
		}

		var	prev, next, parent, range, previousText, rangeStartContainer,
			newEmoticons = [],
			currentBlock = base.currentBlockNode(),
			rangeStart   = false,
			noneWsRegex  = /[^\s\xA0\u2002\u2003\u2009\u00a0]+/;

		utils.each(currentEmoticons, function (emoticon) {
			// Ignore emoticons that have been removed from DOM
			if (!emoticon || !emoticon.parentNode) {
				return;
			}

			if (!dom.contains(currentBlock, emoticon)) {
				newEmoticons.push(emoticon);
				return;
			}

			prev         = emoticon.previousSibling;
			next         = emoticon.nextSibling;
			previousText = prev.nodeValue;

			// For IE's HTMLPhraseElement
			if (previousText === null) {
				previousText = prev.innerText || '';
			}

			if ((!prev || !noneWsRegex.test(prev.nodeValue.slice(-1))) &&
				(!next || !noneWsRegex.test((next.nodeValue || '')[0]))) {
				newEmoticons.push(emoticon);
				return;
			}

			parent              = emoticon.parentNode;
			range               = rangeHelper.cloneSelected();
			rangeStartContainer = range.startContainer;
			previousText        = previousText +
				dom.data(emoticon, 'sceditor-emoticon');

			// Store current caret position
			if (rangeStartContainer === next) {
				rangeStart = previousText.length + range.startOffset;
			} else if (rangeStartContainer === currentBlock &&
				currentBlock.childNodes[range.startOffset] === next) {
				rangeStart = previousText.length;
			} else if (rangeStartContainer === prev) {
				rangeStart = range.startOffset;
			}

			if (!next || next.nodeType !== dom.TEXT_NODE) {
				next = parent.insertBefore(
					parent.ownerDocument.createTextNode(''), next
				);
			}

			next.insertData(0, previousText);
			dom.remove(prev);
			dom.remove(emoticon);

			// Need to update the range starting
			// position if it has been modified
			if (rangeStart !== false) {
				range.setStart(next, rangeStart);
				range.collapse(true);
				rangeHelper.selectRange(range);
			}
		});

		currentEmoticons = newEmoticons;
	};

	/**
	 * Gets if emoticons are currently enabled
	 * @return {boolean}
	 * @function
	 * @name emoticons
	 * @memberOf sceditor.prototype
	 * @since 1.4.2
	 */
	/**
	 * Enables/disables emoticons
	 *
	 * @param {boolean} enable
	 * @return {this}
	 * @function
	 * @name emoticons^2
	 * @memberOf sceditor.prototype
	 * @since 1.4.2
	 */
	base.emoticons = function (enable) {
		if (!enable && enable !== false) {
			return options.emoticonsEnabled;
		}

		options.emoticonsEnabled = enable;

		currentEmoticons = dom.find(wysiwygBody, EMOTICONS_SELECTOR);

		if (enable) {
			dom.on(wysiwygBody, 'keypress', emoticonsKeyPress);

			if (!base.sourceMode()) {
				rangeHelper.saveRange();

				replaceEmoticons(wysiwygBody);
				triggerValueChanged(false);

				rangeHelper.restoreRange();
			}
		} else {
			utils.each(currentEmoticons, function (_, img) {
				var text = dom.data(img, 'sceditor-emoticon');
				var textNode = wysiwygDoc.createTextNode(text);
				img.parentNode.replaceChild(textNode, img);
			});

			currentEmoticons = [];
			dom.off(wysiwygBody, 'keypress', emoticonsKeyPress);

			triggerValueChanged();
		}

		return base;
	};

	/**
	 * Gets the current WYSIWYG editors inline CSS
	 *
	 * @return {string}
	 * @function
	 * @name css
	 * @memberOf sceditor.prototype
	 * @since 1.4.3
	 */
	/**
	 * Sets inline CSS for the WYSIWYG editor
	 *
	 * @param {string} css
	 * @return {this}
	 * @function
	 * @name css^2
	 * @memberOf sceditor.prototype
	 * @since 1.4.3
	 */
	base.css = function (css) {
		if (!inlineCss) {
			inlineCss = dom.createElement('style', {
				id: 'inline'
			}, wysiwygDoc);

			dom.appendChild(wysiwygDoc.head, inlineCss);
		}

		if (!utils.isString(css)) {
			return inlineCss.styleSheet ?
				inlineCss.styleSheet.cssText : inlineCss.innerHTML;
		}

		if (inlineCss.styleSheet) {
			inlineCss.styleSheet.cssText = css;
		} else {
			inlineCss.innerHTML = css;
		}

		return base;
	};

	/**
	 * Handles the keydown event, used for shortcuts
	 * @private
	 */
	handleKeyDown = function (e) {
		var	shortcut   = [],
			SHIFT_KEYS = {
				'`': '~',
				'1': '!',
				'2': '@',
				'3': '#',
				'4': '$',
				'5': '%',
				'6': '^',
				'7': '&',
				'8': '*',
				'9': '(',
				'0': ')',
				'-': '_',
				'=': '+',
				';': ': ',
				'\'': '"',
				',': '<',
				'.': '>',
				'/': '?',
				'\\': '|',
				'[': '{',
				']': '}'
			},
			SPECIAL_KEYS = {
				8: 'backspace',
				9: 'tab',
				13: 'enter',
				19: 'pause',
				20: 'capslock',
				27: 'esc',
				32: 'space',
				33: 'pageup',
				34: 'pagedown',
				35: 'end',
				36: 'home',
				37: 'left',
				38: 'up',
				39: 'right',
				40: 'down',
				45: 'insert',
				46: 'del',
				91: 'win',
				92: 'win',
				93: 'select',
				96: '0',
				97: '1',
				98: '2',
				99: '3',
				100: '4',
				101: '5',
				102: '6',
				103: '7',
				104: '8',
				105: '9',
				106: '*',
				107: '+',
				109: '-',
				110: '.',
				111: '/',
				112: 'f1',
				113: 'f2',
				114: 'f3',
				115: 'f4',
				116: 'f5',
				117: 'f6',
				118: 'f7',
				119: 'f8',
				120: 'f9',
				121: 'f10',
				122: 'f11',
				123: 'f12',
				144: 'numlock',
				145: 'scrolllock',
				186: ';',
				187: '=',
				188: ',',
				189: '-',
				190: '.',
				191: '/',
				192: '`',
				219: '[',
				220: '\\',
				221: ']',
				222: '\''
			},
			NUMPAD_SHIFT_KEYS = {
				109: '-',
				110: 'del',
				111: '/',
				96: '0',
				97: '1',
				98: '2',
				99: '3',
				100: '4',
				101: '5',
				102: '6',
				103: '7',
				104: '8',
				105: '9'
			},
			which     = e.which,
			character = SPECIAL_KEYS[which] ||
				String.fromCharCode(which).toLowerCase();

		if (e.ctrlKey || e.metaKey) {
			shortcut.push('ctrl');
		}

		if (e.altKey) {
			shortcut.push('alt');
		}

		if (e.shiftKey) {
			shortcut.push('shift');

			if (NUMPAD_SHIFT_KEYS[which]) {
				character = NUMPAD_SHIFT_KEYS[which];
			} else if (SHIFT_KEYS[character]) {
				character = SHIFT_KEYS[character];
			}
		}

		// Shift is 16, ctrl is 17 and alt is 18
		if (character && (which < 16 || which > 18)) {
			shortcut.push(character);
		}

		shortcut = shortcut.join('+');
		if (shortcutHandlers[shortcut]) {
			return shortcutHandlers[shortcut].call(base);
		}
	};

	/**
	 * Adds a shortcut handler to the editor
	 * @param  {String}          shortcut
	 * @param  {String|Function} cmd
	 * @return {sceditor}
	 */
	base.addShortcut = function (shortcut, cmd) {
		shortcut = shortcut.toLowerCase();

		if (utils.isString(cmd)) {
			shortcutHandlers[shortcut] = function (e) {
				handleCommand(toolbarButtons[cmd], base.commands[cmd]);

				e.preventDefault();
			};
		} else {
			shortcutHandlers[shortcut] = cmd;
		}

		return base;
	};

	/**
	 * Removes a shortcut handler
	 * @param  {String} shortcut
	 * @return {sceditor}
	 */
	base.removeShortcut = function (shortcut) {
		delete shortcutHandlers[shortcut.toLowerCase()];

		return base;
	};

	/**
	 * Handles the backspace key press
	 *
	 * Will remove block styling like quotes/code ect if at the start.
	 * @private
	 */
	handleBackSpace = function (e) {
		var	node, offset, range, parent;

		// 8 is the backspace key
		if (options.disableBlockRemove || e.which !== 8 ||
			!(range = rangeHelper.selectedRange())) {
			return;
		}

		node   = range.startContainer;
		offset = range.startOffset;

		if (offset !== 0 || !(parent = currentStyledBlockNode())) {
			return;
		}

		while (node !== parent) {
			while (node.previousSibling) {
				node = node.previousSibling;

				// Everything but empty text nodes before the cursor
				// should prevent the style from being removed
				if (node.nodeType !== dom.TEXT_NODE || node.nodeValue) {
					return;
				}
			}

			if (!(node = node.parentNode)) {
				return;
			}
		}

		if (!parent || dom.is(parent, 'body')) {
			return;
		}

		// The backspace was pressed at the start of
		// the container so clear the style
		base.clearBlockFormatting(parent);
		e.preventDefault();
	};

	/**
	 * Gets the first styled block node that contains the cursor
	 * @return {HTMLElement}
	 */
	currentStyledBlockNode = function () {
		var block = currentBlockNode;

		while (!dom.hasStyling(block) || dom.isInline(block, true)) {
			if (!(block = block.parentNode) || dom.is(block, 'body')) {
				return;
			}
		}

		return block;
	};

	/**
	 * Clears the formatting of the passed block element.
	 *
	 * If block is false, if will clear the styling of the first
	 * block level element that contains the cursor.
	 * @param  {HTMLElement} block
	 * @since 1.4.4
	 */
	base.clearBlockFormatting = function (block) {
		block = block || currentStyledBlockNode();

		if (!block || dom.is(block, 'body')) {
			return base;
		}

		rangeHelper.saveRange();

		block.className = '';
		lastRange       = null;

		dom.attr(block, 'style', '');

		if (!dom.is(block, 'p,div,td')) {
			dom.convertElement(block, 'p');
		}

		rangeHelper.restoreRange();
		return base;
	};

	/**
	 * Triggers the valueChanged signal if there is
	 * a plugin that handles it.
	 *
	 * If rangeHelper.saveRange() has already been
	 * called, then saveRange should be set to false
	 * to prevent the range being saved twice.
	 *
	 * @since 1.4.5
	 * @param {Boolean} saveRange If to call rangeHelper.saveRange().
	 * @private
	 */
	triggerValueChanged = function (saveRange) {
		if (!pluginManager ||
			(!pluginManager.hasHandler('valuechangedEvent') &&
				!triggerValueChanged.hasHandler)) {
			return;
		}

		var	currentHtml,
			sourceMode   = base.sourceMode(),
			hasSelection = !sourceMode && rangeHelper.hasSelection();

		// Don't need to save the range if sceditor-start-marker
		// is present as the range is already saved
		saveRange = saveRange !== false &&
			!wysiwygDoc.getElementById('sceditor-start-marker');

		// Clear any current timeout as it's now been triggered
		if (valueChangedKeyUp.timer) {
			clearTimeout(valueChangedKeyUp.timer);
			valueChangedKeyUp.timer = false;
		}

		if (hasSelection && saveRange) {
			rangeHelper.saveRange();
		}

		currentHtml = sourceMode ? sourceEditor.value : wysiwygBody.innerHTML;

		// Only trigger if something has actually changed.
		if (currentHtml !== triggerValueChanged.lastHtmlValue) {
			triggerValueChanged.lastHtmlValue = currentHtml;

			dom.trigger(editorContainer, 'valuechanged', {
				rawValue: sourceMode ? base.val() : currentHtml
			});
		}

		if (hasSelection && saveRange) {
			rangeHelper.removeMarkers();
		}
	};

	/**
	 * Should be called whenever there is a blur event
	 * @private
	 */
	valueChangedBlur = function () {
		if (valueChangedKeyUp.timer) {
			triggerValueChanged();
		}
	};

	/**
	 * Should be called whenever there is a keypress event
	 * @param  {Event} e The keypress event
	 * @private
	 */
	valueChangedKeyUp = function (e) {
		var which         = e.which,
			lastChar      = valueChangedKeyUp.lastChar,
			lastWasSpace  = (lastChar === 13 || lastChar === 32),
			lastWasDelete = (lastChar === 8 || lastChar === 46);

		valueChangedKeyUp.lastChar = which;

		// 13 = return & 32 = space
		if (which === 13 || which === 32) {
			if (!lastWasSpace) {
				triggerValueChanged();
			} else {
				valueChangedKeyUp.triggerNextChar = true;
			}
		// 8 = backspace & 46 = del
		} else if (which === 8 || which === 46) {
			if (!lastWasDelete) {
				triggerValueChanged();
			} else {
				valueChangedKeyUp.triggerNextChar = true;
			}
		} else if (valueChangedKeyUp.triggerNextChar) {
			triggerValueChanged();
			valueChangedKeyUp.triggerNextChar = false;
		}

		// Clear the previous timeout and set a new one.
		clearTimeout(valueChangedKeyUp.timer);

		// Trigger the event 1.5s after the last keypress if space
		// isn't pressed. This might need to be lowered, will need
		// to look into what the slowest average Chars Per Min is.
		valueChangedKeyUp.timer = setTimeout(function () {
			triggerValueChanged();
		}, 1500);
	};

	autoUpdate = function () {
		if (!autoUpdateCanceled) {
			base.updateOriginal();
		}

		autoUpdateCanceled = false;
	};

	// run the initializer
	init();
};


/**
 * Map containing the loaded SCEditor locales
 * @type {Object}
 * @name locale
 * @memberOf sceditor
 */
SCEditor.locale = {};


/**
 * Static command helper class
 * @class command
 * @name sceditor.command
 */
SCEditor.command =
/** @lends sceditor.command */
{
	/**
	 * Gets a command
	 *
	 * @param {String} name
	 * @return {Object|null}
	 * @since v1.3.5
	 */
	get: function (name) {
		return SCEditor.commands[name] || null;
	},

	/**
	 * <p>Adds a command to the editor or updates an existing
	 * command if a command with the specified name already exists.</p>
	 *
	 * <p>Once a command is add it can be included in the toolbar by
	 * adding it's name to the toolbar option in the constructor. It
	 * can also be executed manually by calling
	 * {@link sceditor.execCommand}</p>
	 *
	 * @example
	 * SCEditor.command.set("hello",
	 * {
	 *     exec: function () {
	 *         alert("Hello World!");
	 *     }
	 * });
	 *
	 * @param {String} name
	 * @param {Object} cmd
	 * @return {this|false} Returns false if name or cmd is false
	 * @since v1.3.5
	 */
	set: function (name, cmd) {
		if (!name || !cmd) {
			return false;
		}

		// merge any existing command properties
		cmd = utils.extend(SCEditor.commands[name] || {}, cmd);

		cmd.remove = function () {
			SCEditor.command.remove(name);
		};

		SCEditor.commands[name] = cmd;
		return this;
	},

	/**
	 * Removes a command
	 *
	 * @param {String} name
	 * @return {this}
	 * @since v1.3.5
	 */
	remove: function (name) {
		if (SCEditor.commands[name]) {
			delete SCEditor.commands[name];
		}

		return this;
	}
};
