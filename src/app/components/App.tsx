import React, { useEffect, useCallback } from 'react';

function App() {
  const handleClickExtract = useCallback(() => {
    parent.postMessage({ pluginMessage: { type: 'extract' } }, '*')
  }, [])

  const handleClickCancel = useCallback(() => {
    parent.postMessage({ pluginMessage: { type: 'cancel' } }, '*')
  }, [])

  return (
    <>
      <h2>Bezier Figma Plugin</h2>
      <button onClick={handleClickExtract}>
        Extract Icon
      </button>
      <button onClick={handleClickCancel}>
        Cancel
      </button>
    </>
  )
};

export default App;