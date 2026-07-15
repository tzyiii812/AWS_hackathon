import { ScrollViewStyleReset } from 'expo-router/html';

// This file is web-only and used to configure the root HTML for every
// web page during static rendering.
// The contents of this function only run in Node.js environments and
// do not have access to the DOM or browser APIs.
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* 
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native. 
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}
        <ScrollViewStyleReset />

        {/* Using raw CSS styles as an escape-hatch to ensure the background color never flickers in dark-mode. */}
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
        {/* Add any additional <head> elements that you want globally available on web... */}
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
body {
  background-color: #E8E5E0;
}
@media (prefers-color-scheme: dark) {
  body {
    background-color: #1a1a1a;
  }
}

/* Mobile First: phone fullscreen, desktop fixed width centered */
#root {
  max-width: 430px;
  margin-left: auto;
  margin-right: auto;
  background-color: #FAF9F7;
  min-height: 100vh;
  /* Subtle shadow to make the app look like a phone on desktop */
  box-shadow: 0 0 40px rgba(0, 0, 0, 0.08);
}

@media (prefers-color-scheme: dark) {
  #root {
    background-color: #000;
  }
}

/* On mobile screens (<=430px), fill the entire viewport */
@media (max-width: 430px) {
  body {
    background-color: #FAF9F7;
  }
  #root {
    max-width: 100%;
    box-shadow: none;
  }
  @media (prefers-color-scheme: dark) {
    body {
      background-color: #000;
    }
  }
}`;
