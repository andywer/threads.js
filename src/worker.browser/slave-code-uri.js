import slaveCode from './slave-code';

let slaveCodeDataUri = 'data:text/javascript;charset=utf-8,' + encodeURI(slaveCode);
let createBlobURL = window.createBlobURL || window.createObjectURL;

if (!createBlobURL) {
  const URL = window.URL || window.webkitURL;

  if (URL) {
    createBlobURL = URL.createObjectURL;
  } else {
    throw new Error('No Blob creation implementation found.');
  }
}

if (typeof window.BlobBuilder === 'function' && typeof createBlobURL === 'function') {
  const blobBuilder = new window.BlobBuilder();
  blobBuilder.append(slaveCode);
  slaveCodeDataUri = createBlobURL(blobBuilder.getBlob());
} else if (typeof window.Blob === 'function' && typeof createBlobURL === 'function') {
  const blob = new window.Blob([ slaveCode ], { type: 'text/javascript' });
  slaveCodeDataUri = createBlobURL(blob);
}

export default slaveCodeDataUri;
