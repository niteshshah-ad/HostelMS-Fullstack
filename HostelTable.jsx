import { getStaticAssetUrl } from "../lib/api";

function HostelTable({ hostels, handleDelete, handleEdit, isDeleting }) {
  const resolveImageSrc = (imageValue) => {
    if (!imageValue || typeof imageValue !== "string") return "";
    if (
      imageValue.startsWith("http") ||
      imageValue.startsWith("blob:") ||
      imageValue.startsWith("data:")
    ) {
      return imageValue;
    }

    return getStaticAssetUrl(imageValue);
  };

  const getImageSrc = (hostel) => {
    if (hostel.imagePreview) return resolveImageSrc(hostel.imagePreview);
    if (hostel.image) return resolveImageSrc(hostel.image);

    if (Array.isArray(hostel.images) && hostel.images.length > 0) {
      const [firstImage] = hostel.images;
      if (typeof firstImage === "string" && firstImage.startsWith("http")) {
        return firstImage;
      }

      if (typeof firstImage === "string") {
        return getStaticAssetUrl(firstImage);
      }
    }

    return "";
  };

  if (hostels.length === 0) {
    return (
      <div className="warden-empty-panel">
        <h3>No hostels added yet</h3>
        <p>Add your first hostel from the dashboard to start tracking rooms and revenue.</p>
      </div>
    );
  }

  return (
    <div className="warden-table-shell">
      <table className="warden-hostel-table">
        <thead>
          <tr>
            <th>Hostel</th>
            <th>City</th>
            <th>Rent</th>
            <th>Available</th>
            <th>Revenue</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {hostels.map((h, index) => {
            const availableLabel = `${Number(h.available_rooms)}/${Number(h.total_rooms)} available`;
            const imageSrc = getImageSrc(h);

            return (
              <tr key={h._id || h.id || `${h.name}-${index}`}>
                <td>
                  <div className="warden-table-hostel">
                    <div className="warden-table-thumb">
                      {imageSrc ? (
                        <img src={imageSrc} alt={h.name} />
                      ) : (
                        <span>{h.name?.slice(0, 1) || "H"}</span>
                      )}
                    </div>
                    <div>
                      <strong>{h.name}</strong>
                      <span>{h.location || "Prime area"}</span>
                    </div>
                  </div>
                </td>
                <td>{h.city || "--"}</td>
                <td>₹{h.rent}</td>
                <td>{availableLabel}</td>
                <td>₹{h.revenue}</td>
                <td>
                  <div className="warden-table-actions">
                    <button
                      className="warden-edit-btn"
                      onClick={() => handleEdit(h)}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      className="warden-delete-btn"
                      onClick={() => handleDelete(h)}
                      disabled={isDeleting}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default HostelTable;
