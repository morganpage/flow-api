const fcl = require('@onflow/fcl');
const config = require('../../tools');
const NFTModel = require('./NFTModel');

export async function get (address: string, collectionIds: any, network: string) {
    config.setup(fcl, network);
    const cadence =  `
    import MetadataViews from 0xMetadataViews
    import NFTCatalog from 0xNFTCatalog
    import NFTRetrieval from 0xNFTRetrieval

    pub struct NFT {
        pub let id : UInt64
        pub let name : String
        pub let description : String
        pub let thumbnail : String
        pub let externalURL : String
        pub let storagePath : StoragePath
        pub let publicPath : PublicPath
        pub let privatePath: PrivatePath
        pub let publicLinkedType: Type
        pub let privateLinkedType: Type
        pub let collectionName : String
        pub let collectionDescription: String
        pub let collectionSquareImage : String
        pub let collectionBannerImage : String
        pub let collectionExternalURL : String
        pub let royalties: [MetadataViews.Royalty]
        pub let traits: [MetadataViews.Trait]

        init(
                id: UInt64,
                name : String,
                description : String,
                thumbnail : String,
                externalURL : String,
                storagePath : StoragePath,
                publicPath : PublicPath,
                privatePath : PrivatePath,
                publicLinkedType : Type,
                privateLinkedType : Type,
                collectionName : String,
                collectionDescription : String,
                collectionSquareImage : String,
                collectionBannerImage : String,
                collectionExternalURL : String,
                royalties : [MetadataViews.Royalty],
                traits: [MetadataViews.Trait]
        ) {
            self.id = id
            self.name = name
            self.description = description
            self.thumbnail = thumbnail
            self.externalURL = externalURL
            self.storagePath = storagePath
            self.publicPath = publicPath
            self.privatePath = privatePath
            self.publicLinkedType = publicLinkedType
            self.privateLinkedType = privateLinkedType
            self.collectionName = collectionName
            self.collectionDescription = collectionDescription
            self.collectionSquareImage = collectionSquareImage
            self.collectionBannerImage = collectionBannerImage
            self.collectionExternalURL = collectionExternalURL
            self.royalties = royalties
            self.traits = traits
        }
    }

    pub fun main(ownerAddress: Address, collections: {String : [UInt64]}) : {String : [NFT] } {
        let data : {String : [NFT] } = {}

        let catalog = NFTCatalog.getCatalog()
        let account = getAuthAccount(ownerAddress)
        for collectionIdentifier in collections.keys {
            if catalog.containsKey(collectionIdentifier) {
                let value = catalog[collectionIdentifier]!
                let tempPathStr = "catalog".concat(collectionIdentifier)
                let tempPublicPath = PublicPath(identifier: tempPathStr)!
                account.link<&{MetadataViews.ResolverCollection}>(
                    tempPublicPath,
                    target: value.collectionData.storagePath
                )

                let collectionCap = account.getCapability<&AnyResource{MetadataViews.ResolverCollection}>(tempPublicPath)

                if !collectionCap.check() {
                    return data
                }

                let views = NFTRetrieval.getNFTViewsFromIDs(collectionIdentifier : collectionIdentifier, ids: collections[collectionIdentifier]!, collectionCap : collectionCap)

                let items : [NFT] = []

                for view in views {
                        let displayView = view.display
                        let externalURLView = view.externalURL
                        let collectionDataView = view.collectionData
                        let collectionDisplayView = view.collectionDisplay
                        let royaltyView = view.royalties
                        let traitsView = view.traits
                        if (displayView == nil || externalURLView == nil || collectionDataView == nil || collectionDisplayView == nil || royaltyView == nil) {
                            // Bad NFT. Skipping....
                            continue
                        }

                        items.append(
                            NFT(
                                id: view.id,
                                name : displayView!.name,
                                description : displayView!.description,
                                thumbnail : displayView!.thumbnail.uri(),
                                externalURL : externalURLView!.url,
                                storagePath : collectionDataView!.storagePath,
                                publicPath : collectionDataView!.publicPath,
                                privatePath : collectionDataView!.providerPath,
                                publicLinkedType : collectionDataView!.publicLinkedType,
                                privateLinkedType : collectionDataView!.providerLinkedType,
                                collectionName : collectionDisplayView!.name,
                                collectionDescription : collectionDisplayView!.description,
                                collectionSquareImage : collectionDisplayView!.squareImage.file.uri(),
                                collectionBannerImage : collectionDisplayView!.bannerImage.file.uri(),
                                collectionExternalURL : collectionDisplayView!.externalURL.url,
                                royalties : royaltyView!.getRoyalties()
                                traits : traitsView!.traits
                            )
                        )
                    }

                    data[collectionIdentifier] = items
            }
        }


        return data
    }
    `

    const result = await fcl.query({
        cadence: cadence,
        args: (arg :any, t : any) => [arg(address, t.Address), arg(collectionIds, t.Dictionary({key: t.String, value: t.Array(t.UInt64)}))],
      });

    return result;
};