// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract DecentralizedMarketplace {
    struct Dataset {
        address owner;
        string ipfsHash;
        uint256 price;
        bool isAvailable;
        string metadata;
        uint256 timestamp;
        uint256 accessCount;
        string watermarkHash;  // Hash of the watermarked data
        string reEncryptionKey; // Proxy re-encryption key
        bool isWatermarked;
        bool isReEncrypted;
    }

    mapping(uint256 => Dataset) public datasets;
    mapping(uint256 => mapping(address => bool)) public accessPermissions;
    mapping(uint256 => mapping(address => string)) public userWatermarks; // Store user-specific watermarks
    uint256 public datasetCounter;

    event DatasetUploaded(uint256 indexed datasetId, address indexed owner, string ipfsHash, uint256 price, string metadata, uint256 timestamp);
    event DatasetPurchased(uint256 indexed datasetId, address indexed buyer);
    event DatasetUpdated(uint256 indexed datasetId, string newMetadata, uint256 newPrice);
    event DatasetRemoved(uint256 indexed datasetId);
    event DatasetWatermarked(uint256 indexed datasetId, string watermarkHash);
    event DatasetReEncrypted(uint256 indexed datasetId, string reEncryptionKey);

    function uploadDataset(string memory _ipfsHash, uint256 _price, string memory _metadata) public {
        datasetCounter++;
        datasets[datasetCounter] = Dataset(
            msg.sender,
            _ipfsHash,
            _price,
            true,
            _metadata,
            block.timestamp,
            0,
            "",
            "",
            false,
            false
        );
        emit DatasetUploaded(datasetCounter, msg.sender, _ipfsHash, _price, _metadata, block.timestamp);
    }

    function addWatermark(uint256 _datasetId, string memory _watermarkHash) public {
        Dataset storage dataset = datasets[_datasetId];
        require(msg.sender == dataset.owner, "Only owner can add watermark");
        require(dataset.isAvailable, "Dataset not available");
        
        dataset.watermarkHash = _watermarkHash;
        dataset.isWatermarked = true;
        emit DatasetWatermarked(_datasetId, _watermarkHash);
    }

    function addReEncryptionKey(uint256 _datasetId, string memory _reEncryptionKey) public {
        Dataset storage dataset = datasets[_datasetId];
        require(msg.sender == dataset.owner, "Only owner can add re-encryption key");
        require(dataset.isAvailable, "Dataset not available");
        
        dataset.reEncryptionKey = _reEncryptionKey;
        dataset.isReEncrypted = true;
        emit DatasetReEncrypted(_datasetId, _reEncryptionKey);
    }

    function purchaseDataset(uint256 _datasetId) public payable {
        Dataset storage dataset = datasets[_datasetId];
        require(dataset.isAvailable, "Dataset not available");
        require(msg.value >= dataset.price, "Insufficient funds");

        payable(dataset.owner).transfer(msg.value);
        accessPermissions[_datasetId][msg.sender] = true;
        dataset.accessCount++;
        emit DatasetPurchased(_datasetId, msg.sender);
    }

    function hasAccess(uint256 _datasetId, address _user) public view returns (bool) {
        return accessPermissions[_datasetId][_user];
    }

    function updateDataset(uint256 _datasetId, string memory _newMetadata, uint256 _newPrice) public {
        Dataset storage dataset = datasets[_datasetId];
        require(msg.sender == dataset.owner, "Only owner can update");
        dataset.metadata = _newMetadata;
        dataset.price = _newPrice;
        emit DatasetUpdated(_datasetId, _newMetadata, _newPrice);
    }

    function removeDataset(uint256 _datasetId) public {
        Dataset storage dataset = datasets[_datasetId];
        require(msg.sender == dataset.owner, "Only owner can remove");
        dataset.isAvailable = false;
        emit DatasetRemoved(_datasetId);
    }

    function getDataset(uint256 _datasetId) public view returns (
        address owner,
        string memory ipfsHash,
        uint256 price,
        bool isAvailable,
        string memory metadata,
        uint256 timestamp,
        uint256 accessCount,
        string memory watermarkHash,
        string memory reEncryptionKey,
        bool isWatermarked,
        bool isReEncrypted
    ) {
        require(_datasetId > 0 && _datasetId <= datasetCounter, "Dataset does not exist");
        Dataset storage dataset = datasets[_datasetId];
        return (
            dataset.owner,
            dataset.ipfsHash,
            dataset.price,
            dataset.isAvailable,
            dataset.metadata,
            dataset.timestamp,
            dataset.accessCount,
            dataset.watermarkHash,
            dataset.reEncryptionKey,
            dataset.isWatermarked,
            dataset.isReEncrypted
        );
    }

    function getDatasetCounter() public view returns (uint256) {
        return datasetCounter;
    }
}
