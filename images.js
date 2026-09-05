

(function (root) {
  const WGH_IMAGES = {
    site: {
      // Homepage / sharing
      homepageHero: "images/hero.jpg",
      socialShare: "images/hero.jpg",
      retailCampaign: "images/ruche-wrap-mini-dress-curry.jpeg",
      wholesaleCampaign: "images/wholesale.jpg",
      productionBanner: "images/prod.jpg",
      categoryDresses: "images/ruffle-asymmetric-mini-dress-black.jpeg",
      categoryTops: "images/ruffle-button-top-black.jpeg",
      categoryPants: "images/foldover-waist-flare-pants-brown.jpeg",
      categoryTwoPieces: "images/nunu-tie-waist-skirt-set-olive.jpeg",
      categorySets: "images/foldover-waist-flare-pants-brown.jpeg",
      wholesaleStory: "images/story.jpg",

      // Authentication / admin
      accountLogin: "images/account.jpg",
      adminLogin: "images/admin.jpg",

      // Homepage editorial strip — currently uses her real product photos
      editorial1: "images/drapped-halter-mini-dress-dark-brown.jpeg",
      editorial2: "images/ruffle-asymmetric-mini-dress-pink.jpeg",
      editorial3: "images/dante-capri-army-green.jpeg",
      editorial4: "images/foldover-waist-flare-pants-brown.jpeg"
    },

    products: {
      "drapped-halter-mini-dress": {
        colours: {
          "Dark Brown": ["images/drapped-halter-mini-dress-dark-brown.jpeg"],
          "Black": ["images/drapped-halter-mini-dress-black.jpeg"],
          "Grey": ["images/drapped-halter-mini-dress-grey.jpeg"],
          "Baby Blue": ["images/drapped-halter-mini-dress-baby-blue.jpeg"]
        }
      },
      "ruffle-asymmetric-mini-dress": {
        colours: {
          "Pink": ["images/ruffle-asymmetric-mini-dress-pink.jpeg"],
          "White": ["images/ruffle-asymmetric-mini-dress-white.jpeg"],
          "Black": ["images/ruffle-asymmetric-mini-dress-black.jpeg"]
        }
      },
      "ruche-wrap-mini-dress": {
        colours: {
          "Black": ["images/ruche-wrap-mini-dress-black.jpeg"],
          "Curry": ["images/ruche-wrap-mini-dress-curry.jpeg"],
          "White": ["images/ruche-wrap-mini-dress-white.jpeg"]
        }
      },
      "nael-mini-dress": {
        colours: {
          "Red": ["images/nael-mini-dress-red.jpeg"],
          "Orange": ["images/nael-mini-dress-orange.jpeg"],
          "Black": ["images/nael-mini-dress-black.jpeg"]
        }
      },
      "dante-capri": {
        colours: {
          "Army Green": ["images/dante-capri-army-green.jpeg"],
          "Grey": ["images/dante-capri-grey.jpeg"],
          "Black": ["images/dante-capri-black.jpeg"],
          "Brown": ["images/dante-capri-brown.jpeg"]
        }
      },
      "ruched-waist-pants": {
        colours: {
          "Black": ["images/ruched-waist-pants-black.jpeg"],
          "Red": ["images/ruched-waist-pants-red.jpeg"],
          "Brown": ["images/ruched-waist-pants-brown.jpeg"]
        }
      },
      "foldover-waist-flare-pants": {
        colours: {
          "Brown": ["images/foldover-waist-flare-pants-brown.jpeg"],
          "Black": ["images/foldover-waist-flare-pants-black.jpeg"],
          "Nude": ["images/foldover-waist-flare-pants-nude.jpeg"],
          "Pink": ["images/foldover-waist-flare-pants-pink.jpeg"]
        }
      },
      "ruffle-button-top": {
        colours: {
          "Black": ["images/ruffle-button-top-black.jpeg"],
          "Pink": ["images/ruffle-button-top-pink.jpeg"],
          "Brown": ["images/ruffle-button-top-brown.jpeg"],
          "Cream": ["images/ruffle-button-top-cream.jpeg"]
        }
      },
      "ribbed-contrast-top": {
        colours: {
          "Black": ["images/ribbed-contrast-top-black.jpeg"],
          "White": ["images/ribbed-contrast-top-white.jpeg"],
          "Flamingo": ["images/ribbed-contrast-top-flamingo.jpeg"],
          "Chartreuse": ["images/ribbed-contrast-top-chartreuse.jpeg"]
        }
      },
      "nunu-tie-waist-skirt-set": {
        colours: {
          "Black": ["images/nunu-tie-waist-skirt-set-black.jpeg"],
          "Olive": ["images/nunu-tie-waist-skirt-set-olive.jpeg"]
        }
      },
      "tube-top-set": {
        colours: {
          "Yellow": ["images/tube-top-set-yellow.jpeg"],
          "Black": ["images/tube-top-set-black.jpeg"],
          "Grey": ["images/tube-top-set-grey.jpeg"]
        }
      },
      "sculpted-high-neck-hugger-dress": {
        cardFeatureAlt: "images/sculpted-high-neck-hugger-dress-black-model.jpeg",
        colours: {
          "Black": ["images/sculpted-high-neck-hugger-dress-black.jpeg", "images/sculpted-high-neck-hugger-dress-black-model.jpeg"],
          "Brown": ["images/sculpted-high-neck-hugger-dress-brown.jpeg"],
          "Red": ["images/sculpted-high-neck-hugger-dress-red.jpeg"],
          "Army Green": ["images/sculpted-high-neck-hugger-dress-army-green.jpeg"]
        }
      },
      "ss-hugger-dress": {
        colours: {
          "Black": ["images/ss-hugger-dress-black.jpeg"],
          "Brown": ["images/ss-hugger-dress-brown.jpeg"],
          "Nude": ["images/ss-hugger-dress-nude.jpg"],
          "Army Green": ["images/ss-hugger-dress-army-green.jpeg"],
          "Gray": ["images/ss-hugger-dress-gray.jpeg"]
        }
      },
      "ls-hugger-dress": {
        colours: {
          "Grey": ["images/ls-hugger-dress-grey.jpeg"],
          "Emerald Green": ["images/ls-hugger-dress-emerald-green.jpeg"],
          "Red": ["images/ls-hugger-dress-red.jpeg"],
          "Black": ["images/ls-hugger-dress-black.jpeg"]
        }
      },
      "thin-strap-hugger-dress": {
        colours: {
          "Brown": ["images/thin-strap-hugger-dress-brown.jpeg"],
          "Black": ["images/thin-strap-hugger-dress-black.jpeg"],
          "Nude": ["images/thin-strap-hugger-dress-nude.jpeg"],
          "Pink": ["images/thin-strap-hugger-dress-pink.jpeg"],
          "Grey": ["images/thin-strap-hugger-dress-grey.jpeg"],
          "Royal Blue": ["images/thin-strap-hugger-dress-royal-blue.jpeg"],
          "Burgundy": ["images/thin-strap-hugger-dress-burgundy.jpeg"]
        }
      },
      "halter-neck-top": {
        colours: {
          "White": ["images/halter-neck-top-white.jpeg"],
          "Blue Black": ["images/halter-neck-top-blue-black.jpeg"],
          "Nude": ["images/halter-neck-top-nude.jpeg"]
        }
      }
    }
  };

  // Build each product's ordered gallery from the colour lists above.
  Object.values(WGH_IMAGES.products).forEach(product => {
    product.all = Object.values(product.colours || {}).flat();
  });

  // Resolve "site.homepageHero" style keys.
  WGH_IMAGES.get = function (path) {
    return String(path || '').split('.').reduce((value, key) => value && value[key], WGH_IMAGES) || '';
  };

  // Browser: expose globally and hydrate static <img>/meta elements.
  root.WGH_IMAGES = WGH_IMAGES;
  if (typeof document !== 'undefined') {
    const apply = () => {
      document.querySelectorAll('[data-wgh-image]').forEach(el => {
        const value = WGH_IMAGES.get(el.getAttribute('data-wgh-image'));
        if (value) el.setAttribute('src', value);
      });
      document.querySelectorAll('[data-wgh-image-content]').forEach(el => {
        const value = WGH_IMAGES.get(el.getAttribute('data-wgh-image-content'));
        if (value) el.setAttribute('content', value);
      });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true });
    else apply();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
