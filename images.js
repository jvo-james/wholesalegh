/*
  THE WHOLESALE GHANA — IMAGE REGISTRY
  =====================================
  Edit image filenames / URLs HERE ONLY.

  You can use either:
    - a local repo path, e.g. "images/my-new-photo.jpg"
    - a full remote URL, e.g. "https://example.com/photo.jpg"

  Homepage/editorial images are in WGH_IMAGES.site.
  Every product colour image is in WGH_IMAGES.products.
  When you replace a product image here, shop cards, product pages and the
  default catalogue will all use the new image automatically.
*/

(function (root) {
  const WGH_IMAGES = {
    site: {
      // Homepage / sharing
      homepageHero: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=2000&q=90",
      socialShare: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1600&q=90",
      retailCampaign: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1400&q=88",
      wholesaleCampaign: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1400&q=88",
      productionBanner: "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=2000&q=88",
      categoryDresses: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=1200&q=88",
      categoryTops: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=88",
      categorySets: "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=1200&q=88",
      wholesaleStory: "https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&w=1600&q=88",

      // Authentication / admin
      accountLogin: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1400&q=88",
      adminLogin: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=1400&q=86",

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
