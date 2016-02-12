jQuery.fn.MobileFormsPopulator = function(obj, options) {

    // ---------------------------------------------------------------------------------------------
    // JSON conversion function

    // convert
    function parseJSON(obj, path) {
        // prepare
        path = path || '';

        // iteration (objects / arrays)
        if (obj == undefined) {
            // do nothing
        } else if (obj.constructor == Object) {
            for ( var prop in obj) {
                var name = path + (path == '' ? prop : '[' + prop + ']');
                parseJSON(obj[prop], name);
            }
        }

        else if (obj.constructor == Array) {
            for (var i = 0; i < obj.length; i++) {
                var index = options.useIndices ? i : '';
                index = options.phpNaming ? '[' + index + ']' : index;
                var name = path + index;
                parseJSON(obj[i], name);
            }
        }

        // assignment (values)
        else {
            // if the element name hasn't yet been defined,
            // create it as a single value
            if (arr[path] == undefined) {
                arr[path] = obj;
            }
            // if the element name HAS been defined, but it's a single value,
            // convert to an array and add the new value
            else if (arr[path].constructor != Array) {
                arr[path] = [ arr[path], obj ];
            }
            // if the element name HAS been defined, and is already an array,
            // push the single value on the end of the stack
            else {
                arr[path].push(obj);
            }
        }
    };

    // ---------------------------------------------------------------------------------------------
    // population functions

    function debug(str) {
        if (window.console && console.log) {
            console.log(str);
        }
    }

    function getElementName(name) {
        if (!options.phpNaming) {
            name = name.replace(/\[\]$/, '');
        }
        return name;
    }

    function populateElement(parentElement, name, value) {
        var selector = options.identifier == 'id' ? '#' + name : '['
                + options.identifier + '="' + name + '"]';
        var element = jQuery(selector, parentElement);
        value = value.toString();
        value = value == 'null' ? '' : value;
        element.html(value);
    }

    function populateFormElement(form, name, value) {
        // check that the named element exists in the form
        var name = getElementName(name); // handle non-php naming
        var element = form[name];
        // if the form element doesn't exist,
        // check if there is a tag with that id
        if (element == undefined) {
            // look for the element
            try {
                element = jQuery('#' + name, form);
                if (element) {
                    element.html(value);
                    return true;
                }
            } catch(err) {}
            console.log('MobileForms (populator) error: No such element as ' + name);
            return false;
        }

        // debug options
        if (options.debug) {
            _populate.elements.push(element);
        }

        // now, place any single elements in an array.
        // this is so that the next bit of code (a loop) can treat them the
        // same as any array-elements passed, ie radiobutton or checkox arrays,
        // and the code will just work

        elements = element.type == undefined && element.length ? element : [ element ];

        // populate the element correctly

        for (var e = 0; e < elements.length; e++) {
            // grab the element
            var element = elements[e];

            // skip undefined elements or function objects (IE only)
            if (!element || typeof element == 'undefined'
                    || typeof element == 'function') {
                continue;
            }

            // anything else, process
            switch (element.type || element.tagName) {
            case 'radio':
                // use the single value to check the radio button
                element.checked = (element.value != '' && value.toString() == element.value);
            case 'checkbox':
                // depends on the value.
                // if it's an array, perform a sub loop
                // if it's a value, just do the check

                var values = value.constructor == Array ? value : [ value ];
                for (var j = 0; j < values.length; j++) {
                    element.checked |= element.value == values[j];
                }
                // element.checked = (element.value != '' &&
                // value.toString().toLowerCase() ==
                // element.value.toLowerCase());
                break;
            case 'select-multiple':
                var values = value.constructor == Array ? value : [ value ];
                for (var i = 0; i < element.options.length; i++) {
                    for (var j = 0; j < values.length; j++) {
                        element.options[i].selected |= element.options[i].value == values[j];
                    }
                }
                break;
            case 'select':
            case 'select-one':
                if ($.isArray(value) && value.length > 1) {
                    for (var i = 0; i < value.length; i++) {
                        $("select[name='" + element.name + "']")[i].value = value[i];
                        var displayedItemsCount = $("select[name='" + element.name + "']").length;
                        if (i < value.length - 1 && displayedItemsCount <= i + 1) {
                            // add new input
                            $("select[name='" + element.name + "']")
                                .siblings('.add').trigger('click');
                        }
                    }
                    break;
                }
                element.value = value.toString() || value;
                $(element).trigger('change').trigger('input');
                break;
            case 'button':
            case 'submit':
                break;
            case 'text':
            case 'textarea':
            default:
                // array input
                if ($.isArray(value) && value.length > 1) {
                    for (var i = 0; i < value.length; i++) {
                        $("input[name='" + element.name + "']")[i].value = value[i];
                        var displayedItemsCount = $("input[name='" + element.name + "']").length;
                        if (i < value.length - 1 && displayedItemsCount <= i + 1) {
                            // add new input
                            $("input[name='" + element.name + "']")
                                .siblings('.add').trigger('click');
                        }
                    }
                    break;
                }
                value = value == null ? '' : value;
                element.value = value;
                $(element).trigger('change').trigger('input');
            }
        }

        jQuery('[name="' + name + '"]').attr('json-populated', true);
    }

    // ---------------------------------------------------------------------------------------------
    // options & setup

    // exit if no data object supplied
    if (obj === undefined) {
        return this;
    };

    // options
    var options = jQuery.extend({
        phpNaming : true,
        phpIndices : false,
        resetForm : true,
        identifier : 'id',
        debug : false
    }, options);

    if (options.phpIndices) {
        options.phpNaming = true;
    }

    // ---------------------------------------------------------------------------------------------
    // convert hierarchical JSON to flat array

    var arr = [];
    parseJSON(obj);

    if (options.debug) {
        _populate = {
            arr : arr,
            obj : obj,
            elements : []
        }
    }

    // ---------------------------------------------------------------------------------------------
    // main process function

    this.each(function() {
        // variables
        var tagName = this.tagName.toLowerCase();
        var method = tagName == 'form' ? populateFormElement : populateElement;

        // reset form?
        if (tagName == 'form' && options.resetForm) {
            this.reset();
        }

        // update elements
        for ( var i in arr) {
            method(this, i, arr[i]);
        }
    });

    return this;
};
