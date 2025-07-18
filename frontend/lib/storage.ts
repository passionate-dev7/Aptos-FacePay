import lighthouse from '@lighthouse-web3/sdk';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

const PINATA_API_KEY = process.env.NEXT_PUBLIC_PINATA_API_KEY!;
const PINATA_SECRET_API_KEY = process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY!;

export const uploadDataAndGetBlobId = async (jsonData, address: string) => {
    try {
        const blob = new Blob([JSON.stringify(jsonData, null, 2)], {
            type: 'application/json',
        });

        const file = new File([blob], `${address}.json`, {
            type: 'application/json',
        });

        const formData = new FormData();
        formData.append('file', file);

        const metadata = JSON.stringify({
            name: `${address}.json`,
        });
        formData.append('pinataMetadata', metadata);

        const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
            method: 'POST',
            body: formData,
            headers: {
                pinata_api_key: PINATA_API_KEY,
                pinata_secret_api_key: PINATA_SECRET_API_KEY,
            },
        });

        const result = await res.json();

        if (!res.ok) throw new Error(result.error || 'Upload failed');

        const blobId = result.IpfsHash;
        console.log('✅ Uploaded to Pinata. CID:', blobId);

        return blobId;
    } catch (error) {
        console.log("Error >>>", error);
        throw new Error(`Error uploading data to ipfs: ${error}`);
    }
}

export const fetchData = async (blobId) => {
    if (!blobId) return;

    try {
        const url = `https://gateway.pinata.cloud/ipfs/${blobId}`;
        const res = await axios.get(url);
        console.log('✅ Fetched from Pinata:', res.data);
        return res.data;
    } catch (err) {
        console.error('Error fetching blob:', err);
        throw new Error(`Error fetching data from ipfs: ${err}`)
    }
};