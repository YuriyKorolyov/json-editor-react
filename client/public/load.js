!function() {
    "use strict";

    function getCurrentScript() {
        return document.currentScript || 
               document.querySelector("script[jv-id]") || 
               document.querySelector("script[data-jv-id]");
    }

    function addEventListener(element, event, handler) {
        if (element.addEventListener) {
            element.addEventListener(event, handler, false);
        } else if (element.attachEvent) {
            element.attachEvent("on" + event, function() {
                handler.call(element, window.event);
            });
        }
    }

    function isSupportedBrowser() {
        var userAgent = navigator.userAgent.toLowerCase();
        return !(userAgent.indexOf("msie") > -1 || userAgent.indexOf("trident") > -1);
    }

    function createLoaderContext() {
        return {
            hasStorage: (function() {
                try {
                    localStorage.setItem("test", "test");
                    localStorage.removeItem("test");
                    return true;
                } catch(e) {
                    return false;
                }
            })(),
            loadScript: function(src, target, onload) {
                target = target || document;
                var firstScript = target.getElementsByTagName("script")[0];
                var script = document.createElement("script");
                script.type = "text/javascript";
                script.async = true;
                script.charset = "UTF-8";
                script.src = src;
                if (onload) {
                    script.onload=onload;
                }
                firstScript.parentNode.insertBefore(script, firstScript);
            }
        };
    }

    function getHostFromScript(scriptSrc) {
        try {
            var url = new URL(scriptSrc);
            return url.host;
        } catch(e) {
            console.error("Failed to parse script URL", e);
            return "localhost:3000"; // fallback
        }
    }

    function initWidget() {
        if (!isSupportedBrowser()) {
            console.log("Browser not supported");
            return;
        }

        var currentScript = getCurrentScript();
        if (!currentScript) {
            console.error("Cannot find current script");
            return;
        }

        var widgetId = currentScript.getAttribute("jv-id") || 
                      currentScript.getAttribute("data-jv-id") || 
                      (function() {
                          var src = currentScript.src;
                          var match = src.match(/https?:\/\/\S+\/widget\/([A-Za-z0-9]+)/);
                          return match ? match[1] : null;
                      })();

        if (!widgetId) {
            console.error("Widget ID not found");
            return;
        }

        // Получаем хост из src текущего скрипта
        var configHost = getHostFromScript(currentScript.src);
        var protocol = window.location.protocol === "https:" ? "https:" : "http:";
        var configUrl = protocol + "//" + configHost + "/script/widget/config/" + widgetId;
        console.log("Config URL:", configUrl);

        var loaderContext = createLoaderContext();

        loadConfig(configUrl, function(config) {
            if (!config) {
                console.error("Failed to load config");
                return;
            }

            initWidgetFrame(config, loaderContext, protocol);
        });
    }

    function loadConfig(url, callback) {
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    try {
                        var config = JSON.parse(xhr.responseText);
                        callback(config);
                    } catch(e) {
                        console.error("Config parse error", e);
                        callback(null);
                    }
                } else {
                    console.error("Config load error", xhr.status);
                    callback(null);
                }
            }
        };
        xhr.open("GET", url, true);
        xhr.send();
    }

    function initWidgetFrame(config, loaderContext, protocol) {
        var iframe = document.createElement("iframe");
        iframe.src = "";
        iframe.style.border = "none";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.display = "none";
        iframe.id = "json-editor-iframe";

        var container = document.createElement("div");
        container.id = "json-editor-container";
        container.appendChild(iframe);
        document.body.appendChild(container);

        var bundleUrl = config.base_url + "/js/bundle_" + config.locale + ".js?rand=" + config.build_number;
        console.log("Bundle URL:", bundleUrl);
        loaderContext.loadScript(bundleUrl, document.head, function() {
            if (typeof window.__editorBundleOnLoad === "function") {
                console.log("Bundle loader function found");
                window.__editorBundleOnLoad((bundleCode) => {
                    injectBundleCode(iframe, bundleCode);
                });
            } else {
                console.log("Bundle loader function not found");
            }
        });
    }

    function injectBundleCode(iframe, code) {
        try {
            const iframeDoc = iframe.contentDocument;
            iframeDoc.open();
            iframeDoc.write(`
            <!DOCTYPE html>
            <html>
                <head>
                <script>
                    ${code}
                </script>
                </head>
                <body></body>
            </html>
            `);
            iframeDoc.close();
        } catch(e) {
            console.error("Failed to inject bundle code", e);
        }
    }

    // Start initialization
    initWidget();
}();