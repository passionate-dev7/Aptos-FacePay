import lighthouse from '@lighthouse-web3/sdk';
import fs from 'fs';

const LIGHTHOUSE_API_KEY = '15b9fbbe.e23de1e7f65c424f930df86b7d1956b6';

export const uploadDataAndGetBlobId = async (jsonData, address: string) => {
    try {
        const blob = new Blob([JSON.stringify(jsonData, null, 2)], {
            type: 'application/json',
        });
        console.log("blob", blob);

        console.log("JSON file size (bytes):", blob.size);

        const file = new File([blob], `${address}.json`, {
            type: 'application/json',
        });
        console.log("file >>>", file);

        const result = await lighthouse.upload([file], LIGHTHOUSE_API_KEY);

        console.log("result >>>>", result);

        const blobId = result.data.Hash;

        return blobId;
    } catch (error) {
        console.log("Error >>>", error);
        throw new Error(`Error uploading data to ipfs: ${error}`);
    }
}

export const fetchData = async (blobId) => {
    if (!blobId) return;

    try {
        const res = await fetch(`https://gateway.lighthouse.storage/ipfs/${blobId}`);
        const response = await res.json();
        console.log("response >>>", response);

        return response
    } catch (err) {
        console.error('Error fetching blob:', err);
        throw new Error(`Error fetching data from ipfs: ${err}`)
    }
};