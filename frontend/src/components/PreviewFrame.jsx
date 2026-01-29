import { forwardRef, useImperativeHandle, useRef, useEffect, useState } from 'react';

const PreviewFrame = forwardRef(({ code, assets = [], isRestricted = false }, ref) => {
    const iframeRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);

    // Generate the HTML content for the iframe
    const generatePreviewContent = (codeObj) => {
        let { html = '', css = '', js = '' } = codeObj || {};

        // 1. Perform asset path replacements
        // If assets are provided, replace asset names with their paths in the HTML
        if (assets && assets.length > 0) {
            assets.forEach(asset => {
                if (asset.name && asset.path) {
                    // Replace all occurrences of the asset name in src attributes
                    // We handle both src="name" and src='name'
                    // Make it case-insensitive and allow for optional extensions in the HTML
                    const escapedName = asset.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

                    // Regex helps find the name in src, with or without extension
                    const regex = new RegExp(`(src=["'])(${escapedName}(\\.[a-zA-Z0-9]+)?)(["'])`, 'gi');

                    // Ensure path uses forward slashes for URL
                    let webPath = asset.path.replace(/\\/g, '/');

                    // If the path doesn't start with assets/ and doesn't have a protocol, 
                    // and it's not starting with /, prepend assets/ just in case
                    if (!webPath.startsWith('assets/') && !webPath.startsWith('/') && !webPath.startsWith('http')) {
                        webPath = 'assets/' + webPath;
                    }

                    html = html.replace(regex, `$1${webPath}$4`);
                }
            });
        }

        // 2. Check if the provided HTML is already a full document
        const isFullDocument = /<html/i.test(html) && /<body/i.test(html);

        if (isFullDocument) {
            // It's a full document. We might still want to inject CSS/JS if they aren't empty
            // and aren't already in the document. 
            // But for simplicity, if it's a full document, we mostly trust it.
            // We can try to insert a <base href="/" /> if not present.
            if (!/<base/i.test(html)) {
                html = html.replace(/<head[^>]*>/i, `$&<base href="/" />`);
            }

            // If CSS provided separately, inject it before </head>
            if (css.trim()) {
                html = html.replace(/<\/head>/i, `<style>${css}</style></head>`);
            }

            // If JS provided separately, inject it before </body>
            if (js.trim()) {
                html = html.replace(/<\/body>/i, `<script>${js}</script></body>`);
            }

            return html;
        }

        // 3. Fallback for partial HTML: wrap in full document structure
        return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <base href="/" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-height: 100vh; }
    ${css}
  </style>
</head>
<body>
  ${html}
  <script>
    try {
      ${js}
    } catch (e) {
      console.error('Preview JS Error:', e);
    }
  </script>
</body>
</html>`;
    };

    // Update preview when code changes
    useEffect(() => {
        if (iframeRef.current && code) {
            const content = generatePreviewContent(code);
            const iframe = iframeRef.current;

            // Use srcdoc for cleaner content injection
            iframe.srcdoc = content;
            setIsLoading(false);
        }
    }, [code]);

    // Expose updatePreview and content window via ref
    useImperativeHandle(ref, () => ({
        updatePreview: (newCode) => {
            if (iframeRef.current) {
                const content = generatePreviewContent(newCode);
                iframeRef.current.srcdoc = content;
            }
        },
        getWindow: () => iframeRef.current?.contentWindow
    }));

    return (
        <div className="relative w-full h-full bg-white">
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                    <div className="text-gray-400 text-sm">Loading preview...</div>
                </div>
            )}
            <iframe
                ref={iframeRef}
                title="Code Preview"
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin"
                style={{
                    pointerEvents: isRestricted ? 'none' : 'auto',
                    userSelect: isRestricted ? 'none' : 'auto'
                }}
            />
        </div>
    );
});

PreviewFrame.displayName = 'PreviewFrame';

export default PreviewFrame;
