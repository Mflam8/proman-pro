Deno.serve(async (req) => {
  try {
    const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!apiKey) {
      return Response.json({ error: "GOOGLE_MAPS_API_KEY not set" }, { status: 500 });
    }

    const { placeId, query, minRating = 0 } = await req.json().catch(() => ({}));

    async function resolvePlaceId() {
      if (placeId) return placeId;
      const q = query || "PROMAN Services El Salvador";
      const url = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
      url.searchParams.set("query", q);
      url.searchParams.set("key", apiKey);
      const r = await fetch(url);
      const js = await r.json();
      if (js.status !== "OK" || !js.results?.length) {
        throw new Error(js.error_message || "Place not found");
      }
      return js.results[0].place_id;
    }

    const pid = await resolvePlaceId();

    const detailsUrl = new URL("https://maps.googleapis.com/maps/api/place/details/json");
    detailsUrl.searchParams.set("place_id", pid);
    detailsUrl.searchParams.set(
      "fields",
      "name,rating,user_ratings_total,url,website,international_phone_number,reviews,photos"
    );
    detailsUrl.searchParams.set("reviews_no_translations", "true");
    detailsUrl.searchParams.set("key", apiKey);

    const detRes = await fetch(detailsUrl);
    const detJson = await detRes.json();

    if (detJson.status !== "OK") {
      return Response.json({ error: detJson.error_message || detJson.status }, { status: 500 });
    }

    const place = detJson.result || {};
    const reviews = (place.reviews || [])
      .filter((rv) => (rv.rating || 0) >= minRating)
      .map((rv) => ({
        author_name: rv.author_name,
        profile_photo_url: rv.profile_photo_url,
        rating: rv.rating,
        text: rv.text,
        relative_time_description: rv.relative_time_description,
        time: rv.time,
        language: rv.language,
        author_url: rv.author_url,
      }));

    // Basic photos metadata without exposing key (client won't fetch via photos API directly)
    const photos = (place.photos || []).slice(0, 6).map((p) => ({
      width: p.width,
      height: p.height,
      // no photo_reference exposed to avoid leaking key via URL construction on client
    }));

    const payload = {
      place_id: pid,
      place_name: place.name,
      rating: place.rating,
      user_ratings_total: place.user_ratings_total,
      maps_url: place.url || `https://www.google.com/maps/place/?q=place_id:${pid}`,
      website: place.website || null,
      phone: place.international_phone_number || null,
      reviews,
      photos,
    };

    return Response.json(payload, { status: 200 });
  } catch (err) {
    return Response.json({ error: err.message || String(err) }, { status: 500 });
  }
});