!function() {
    "use strict";
    window.jsonEditorOnLoad = function(callback) {
        // Сохраняем callback в глобальном объекте
        window._jsonEditorCallbacks = window._jsonEditorCallbacks || [];
        window._jsonEditorCallbacks.push(callback);
    };

    function getCurrentScript() {
        // 1. Пробуем получить текущий выполняемый скрипт
        if (document.currentScript) {
            return document.currentScript;
        }
        
        // 2. Ищем среди всех script тот, который содержит UUID в src
        const scripts = document.getElementsByTagName('script');
        for (let i = 0; i < scripts.length; i++) {
            const src = scripts[i].src;
            if (src && src.match(/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i)) {
                return scripts[i];
            }
        }
        
        return null;
    }

    function getConfigHost() {
    const scriptElement = document.currentScript || 
                        document.querySelector('script[src*="/widget/"]') ||
                        Array.from(document.scripts).pop();
    
    if (!scriptElement || !scriptElement.src) {
        console.error("Script element or src not found");
        return "jsonwidget.fvds.ru"; // значение по умолчанию
    }

    try {
        const url = new URL(scriptElement.src);
        return url.host; // возвращает "localhost:3000" или "jsonwidget.fvds.ru"
    } catch (e) {
        console.warn("Could not parse script URL, using fallback");
        return "jsonwidget.fvds.ru";
    }
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

    function initWidget() {
        if (!isSupportedBrowser()) {
            console.log("Browser not supported");
            return;
        }

        // Получаем текущий script элемент
        const currentScript = getCurrentScript();
        if (!currentScript) {
            console.error("Cannot find current script");
            throw new Error("Widget script not found");
        }

        // Извлекаем UUID из src
        const widgetId = (function() {
            const src = currentScript.src;
            const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;
            const match = src.match(uuidRegex);
            return match ? match[0] : null;
        })();

        if (!widgetId) {
            console.error("Widget ID not found in script URL");
            throw new Error("Invalid widget ID format");
        }

        console.log("Widget ID:", widgetId); 

        const configHost = getConfigHost();
        console.log(configHost);
        //var protocol = window.location.protocol === "https:" ? "https:" : "http:";
        var protocol = "https:";

        localStorage.setItem("jsonEditorHost", protocol + "//" + configHost);
        localStorage.setItem("jsonEditorWidgetId", widgetId);

        var configUrl = protocol + "//" + configHost + "/script/widget/config/" + widgetId;
        console.log(configUrl);

        var loaderContext = createLoaderContext();

        loadConfig(configUrl, function(config) {
            if (!config) {
                console.error("Failed to load config");
                return;
            }

            initWidgetFrame(configHost, loaderContext, protocol);
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

    function initWidgetFrame(configHost, loaderContext, protocol) {
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

        var protocol = "https:";
        var bundleUrl = protocol + "//" + configHost + "/js/bundle_" + "ru" + ".js?rand=" + "001";
        //injectBundleCode(iframe, "");
        console.log(bundleUrl);
        loaderContext.loadScript(bundleUrl, document.head, function() { //protocol + 
            if (typeof window.__editorBundleOnLoad === "function") {
                console.log("function");
                window.__editorBundleOnLoad((bundleCode) => {
                    injectBundleCode(iframe, bundleCode);
                    
                    if (window._jsonEditorCallbacks && window._jsonEditorCallbacks.length) {
                        setTimeout(() => {
                            window._jsonEditorCallbacks.forEach(cb => {
                                try {
                                    cb();
                                } catch (e) {
                                    console.error('Callback error:', e);
                                }
                            });
                            console.log('All callbacks executed');
                        }, 300); // Даем больше времени на инициализацию
                    }
                });
            }
            else
            {
                console.log("not function");
            }
        });
        
    }

    function injectBundleCode(iframe, code) {
        try {
            //var iframeDoc = iframe.contentWindow.document;
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