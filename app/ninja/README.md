> **No data storage** Literally, we don't even use a database, your data is compressed and encoded which ends up being the url itself, try it out yourself and inspect the code if you wish, after extensively testing(2 hours and chatgpt) several compression and encoding methods, and arrived at the conclusion that base64-url and brotli.

This was a fun experiment to create a social link aggregator that didn't depend on data storage, all the data is encoded in the URL.

This is an example URL
https://e-id.to/ninja/G2wAYETdluo5XTCvqMWSB55zuCo65YC52oI6y40PRveUFZMlKA_tP1rR1w8emcxII4YJ5V3bBc-ZlpNx8NyN6NB8M7KQNaEo

I experimented with several methods to arrive to this one.
![telegram-cloud-photo-size-4-5899819325966110101-y](https://github.com/adriangalilea/e-id/assets/90320947/a06d37a0-54b9-4aec-ae14-a096bcac31f9)

The most optimal strategy I came up with was:
- First serializes the data into an array with a standard format.
- Encodes the data into base64.
- Compresses it using brotli.
- It uses brotli-wasm so there's no footprint on the server, it all happens client-side.

# Update
I don't feel as this is a core necessity of any user, more of a personal curiosity detour, hence I deprecated it and archived it for posterity here 🧊

