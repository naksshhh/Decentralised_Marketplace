// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract OptimizedDataMarketplace {
    struct Dataset {
        address owner;
        string ipfsHash;
        string metadata;
        uint256 price;
        bool isAvailable;
        uint256 timestamp;
        uint256 accessCount;
        string encryptedMasterKey;
        string reEncryptionKey;
        bool isReEncrypted;
        mapping(address => bool) hasPurchased;
        mapping(address => string) transformedCapsules;
        mapping(address => string) userWatermarks;
        address[] previousOwners;
        uint256[] transferTimestamps;
    }

    mapping(uint256 => Dataset) public datasets;
    uint256 public datasetCounter;
    address public admin;

      constructor() {
        admin = msg.sender;
    }

    event DatasetListed(uint256 indexed datasetId, address indexed owner, uint256 price);
    event DatasetPurchased(uint256 indexed datasetId, address indexed buyer);
    event CapsuleTransformed(uint256 indexed datasetId, address indexed buyer);
    event DatasetWatermarked(uint256 indexed datasetId, string watermarkHash);
    event DatasetReEncrypted(uint256 indexed datasetId, string reEncryptionKey);
    event DatasetUpdated(uint256 indexed datasetId, string newMetadata, uint256 newPrice);
    event DatasetRemoved(uint256 indexed datasetId);
    event OwnershipTransferred(uint256 indexed datasetId, address indexed previousOwner, address indexed newOwner, uint256 timestamp);

    modifier onlyOwner(uint256 _datasetId) {
        require(msg.sender == datasets[_datasetId].owner, "Not the dataset owner");
        _;
    }

    function uploadDataset(
        string memory _ipfsHash,
        string memory _metadata,
        string memory _encryptedMasterKey,  
        uint256 _price
    ) public returns (uint256) {
        datasetCounter++;
        Dataset storage ds = datasets[datasetCounter];
        ds.owner = msg.sender;
        ds.ipfsHash = _ipfsHash;
        ds.metadata = _metadata;
        ds.encryptedMasterKey = _encryptedMasterKey;
        ds.price = _price;
        ds.timestamp = block.timestamp;
        ds.isAvailable = true;

        emit DatasetListed(datasetCounter, msg.sender, _price);
        return datasetCounter;
    }

    function purchaseDataset(uint256 _datasetId) public payable {
        Dataset storage ds = datasets[_datasetId];
        require(ds.isAvailable, "Dataset not available");
        require(msg.value >= ds.price, "Insufficient payment");
        require(!ds.hasPurchased[msg.sender], "Already purchased");
        require(msg.sender != ds.owner, "Owner cannot purchase own dataset");

        ds.hasPurchased[msg.sender] = true;
        ds.accessCount++;
        payable(ds.owner).transfer(msg.value);

        emit DatasetPurchased(_datasetId, msg.sender);
    }

    function storeTransformedCapsule(uint256 _datasetId, address _buyer, string memory _capsule) public {
        Dataset storage ds = datasets[_datasetId];
        require(msg.sender == ds.owner || isAuthorizedOracle(msg.sender), "Not authorized");
        require(ds.hasPurchased[_buyer], "Buyer hasn't purchased");

        ds.transformedCapsules[_buyer] = _capsule;
        emit CapsuleTransformed(_datasetId, _buyer);
    }


    function addReEncryptionKey(uint256 _datasetId, string memory _reEncryptionKey) public onlyOwner(_datasetId) {
        Dataset storage ds = datasets[_datasetId];
        ds.reEncryptionKey = _reEncryptionKey;
        ds.isReEncrypted = true;
        emit DatasetReEncrypted(_datasetId, _reEncryptionKey);
    }

    function updateDataset(uint256 _datasetId, string memory _metadata, uint256 _price) public onlyOwner(_datasetId) {
        Dataset storage ds = datasets[_datasetId];
        ds.metadata = _metadata;
        ds.price = _price;
        emit DatasetUpdated(_datasetId, _metadata, _price);
    }

    function removeDataset(uint256 _datasetId) public onlyOwner(_datasetId) {
        datasets[_datasetId].isAvailable = false;
        emit DatasetRemoved(_datasetId);
    }

    function transferOwnership(uint256 _datasetId, address newOwner) public onlyOwner(_datasetId) {
        require(newOwner != address(0), "Invalid new owner");
        Dataset storage ds = datasets[_datasetId];
        ds.previousOwners.push(ds.owner);
        ds.transferTimestamps.push(block.timestamp);
        address oldOwner = ds.owner;
        ds.owner = newOwner;

        // Transfer the master key encryption to the new owner's public key
        // Note: In practice, this would require backend oracle intervention to re-encrypt the master key
        ds.encryptedMasterKey = ""; // Placeholder: actual re-encryption should be done off-chain

        emit OwnershipTransferred(_datasetId, oldOwner, newOwner, block.timestamp);
    }

    function getDatasetDetails(uint256 _datasetId) public view returns (
        address owner,
        string memory ipfsHash,
        string memory metadata,
        uint256 price,
        bool isAvailable,
        uint256 accessCount,
        bool hasPurchased,
        string memory encryptedMasterKey,
        string memory reEncryptionKey
    ) {
        Dataset storage ds = datasets[_datasetId];
        return (
            ds.owner,
            ds.ipfsHash,
            ds.metadata,
            ds.price,
            ds.isAvailable,
            ds.accessCount,
            ds.hasPurchased[msg.sender],
            ds.encryptedMasterKey,
            ds.reEncryptionKey
        );
    }

    function getOwnershipHistory(uint256 _datasetId) public view returns (address[] memory, uint256[] memory) {
        Dataset storage ds = datasets[_datasetId];
        return (ds.previousOwners, ds.transferTimestamps);
    }

    function getTransformedCapsule(uint256 _datasetId) public view returns (string memory) {
        Dataset storage ds = datasets[_datasetId];
        require(ds.hasPurchased[msg.sender], "Not purchased");
        return ds.transformedCapsules[msg.sender];
    }

    function getEncryptedMasterKey(uint256 _datasetId) public view onlyOwner(_datasetId) returns (string memory) {
        return datasets[_datasetId].encryptedMasterKey;
    }

    function isAuthorizedOracle(address _oracle) internal pure returns (bool) {
        return _oracle == address(0x1234567890123456789012345678901234567890);
    }

    function hasAccess(uint256 _datasetId, address _user) public view returns (bool) {
        return datasets[_datasetId].hasPurchased[_user];
    }
}
