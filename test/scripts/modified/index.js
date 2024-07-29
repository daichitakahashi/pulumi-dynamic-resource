import mod from "./simple.wasm";

// Define imports available to Wasm instance.
const importObject = {
  imports: {
    imported_func: (arg) => {
      console.log(`Hello from JavaScript: ${arg}`);
    },
  },
};

// Create instance of WebAssembly Module `mod`, supplying
// the expected imports in `importObject`. This should be
// done at the top level of the script to avoid instantiation on every request.
const instance = await WebAssembly.instantiate(mod, importObject);

export default {
  async fetch() {
    // Invoke the `exported_func` from our Wasm Instance with
    // an argument.
    const retval = instance.exports.exported_func(99); // modified!
    // Return the return value!
    return new Response(`Success: ${retval}`);
  },
};
