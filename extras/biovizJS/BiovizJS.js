/**
 * BiovizJS embedded JQuery-UI Widget
 * require: jQuery.js, jQuery-ui.Widget.js
 * @namespace bionext.bioviz
 */
(function($) {
    $.widget('bionext.bioviz', {
        options: {
            biovizPath: './biovizJS/bioviz.html',
            defaultRepresentations: true,
            structureToLoad: null,
            inputScript: null,
            startScript: false,
            enableScriptPlayer: false,
            internalWidgets: true,
            contextMenu: true,
            contextMenuLoad: true,
            pdbCustomUrl: null,
            pdbxCustomUrl: null,
            advancedRepresentation: false, // TODO : Disable advance rep  as AlphaShape by option
            background: null,
            disableImpostors: false,
            structureSizeLimit: 40000
        },
        biovizAPI: null,

        /**
         * @name bionext.bioviz#_create
         * @function
         * @private
         * @description Create this widget
         */
        _create: function() {
            // if(!window.bioviz) {
            //     window.bioviz = {};
            // }
            // this.id = ID++;
            // window.bioviz[id] = this;
            this.element.addClass('bionext.bioviz');
            this.element.addClass('biovizApp');
            this.element.empty();

            var that = this;

            var urlLocation = this.options.biovizPath + '?';
            urlLocation += 'contextmenu=' + encodeURIComponent(JSON.stringify(this.options.contextMenu));
            urlLocation += '&ampcontextmenuload=' + encodeURIComponent(JSON.stringify(this.options.contextMenuLoad));
            urlLocation += '&ampwidgets=' + encodeURIComponent(JSON.stringify(this.options.internalWidgets));
            urlLocation += '&ampplayer=' + encodeURIComponent(JSON.stringify(this.options.enableScriptPlayer));

            this.content = $('<iframe src="' + urlLocation + '" name="biovizFrame" ' +
                            'id="biovizFrame" class="biovizWidget"' +
                            'scrolling="no" seamless="seamless" frameborder="0" allowfullscreen></iframe>').bind('load', function(event) {
                                that.onReady(this, event);
                            }).appendTo($(this.element));
        },
        /**
         * @name bionext.bioviz#_destroy
         * @function
         * @private
         * @description Destroy this widget
         */
        _destroy: function() {
            this.element.removeClass('bionext.bioviz');
        },
        onReady: function(iframe, event) {
            var that = this;

            var iframeDocument = $(iframe).contents()[0] || $(iframe).contents().context.contentDocument;
            biovizAPI = iframeDocument.biovizAPI;

            if (!biovizAPI.isAvailable()) {
                event.data = 'Unable to start WebGL context';
                this._trigger('error', event);
                return;
            }

            biovizAPI._setDefaultRepresentations(this.options.defaultRepresentations);
            biovizAPI._setStructureSizeLimit(this.options.structureSizeLimit);

            if (this.options.disableImpostors) {
                biovizAPI._disableImpostors();
            }

            // Set background
            if (this.options.background != null && !window.localStorage.getItem('background')) {
                biovizAPI.setBackground(this.options.background);
            }

            // Add proxy prototype to call API directly from this widget
            for (var i in biovizAPI) {
                if (typeof (biovizAPI[i]) == 'function') {
                    this[i] = biovizAPI[i].bind(biovizAPI);
                }
            }

            if (this.options.contextMenu) {
                // Change contextmenu to embbed it
                biovizAPI.setExternalContextMenuDiv($(document.body));
            }

            // Link API event to trigger events from this widget
            biovizAPI.addListener('sceneStateChanged', function(event) {
                that._trigger('sceneStateChanged', event.data);
            });
            biovizAPI.addListener('targetChanged', function(event) {
                that._trigger('targetChanged', event.data);
            });
            biovizAPI.addListener('structureLoaded', function(event) {
                that._trigger('structureLoaded', event.data);
            });

            // Link API event to trigger events from this widget
            biovizAPI.addListener('atomMouseOver', function(event) {
                that._trigger('atomMouseOver', event.data);
            });

            $.bionext.RepresentationTypeID = iframeDocument.biovizAPI.RepresentationTypeID;
            $.bionext.BvsRepresentationTypeID = iframeDocument.biovizAPI.BvsRepresentationTypeID;
            $.bionext.LabelTypeID = iframeDocument.biovizAPI.LabelTypeID;
            $.bionext.ColorMappingID = iframeDocument.biovizAPI.ColorMappingID;
            $.bionext.ObjectTypeID = iframeDocument.biovizAPI.ObjectTypeID;

            // Load script
            if (this.options.inputScript != null) {
                biovizAPI.executeScript(this.options.inputScript);
            }

            if (this.options.startScript) {
                biovizAPI.startScript();
            }

            // TODO : Check if it's working
            if (this.options.pdbCustomUrl != null) {
                biovizAPI.setOption('urlTemplate', this.options.pdbCustomUrl);
                biovizAPI.setOption('loadPDBX', false);
            }

            if (this.options.pdbxCustomUrl != null) {
                biovizAPI.setOption('urlTemplate', this.options.pdbxCustomUrl);
                biovizAPI.setOption('loadPDBX', true);
            }

            // Load structure
            if (this.options.structureToLoad != null) {
                biovizAPI.loadStructure(this.options.structureToLoad).catch(function(e) {
                    console.warn(e.message);
                });
            }

            this._trigger('ready', event, {api: biovizAPI});
        }
    });
}(jQuery));
