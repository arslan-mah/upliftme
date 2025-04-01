import React, { useState } from "react";
import { Camera, Upload } from "lucide-react";
const serverUri = import.meta.env.VITE_SERVER_URI;


interface ProfileSetupProps {
  role: "hero" | "uplifter";
  onComplete: () => void;
}

const ProfileSetup: React.FC<ProfileSetupProps> = ({ role, onComplete }) => {
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(""); // Image preview URL
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // File object
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle image selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setAvatarUrl(URL.createObjectURL(file)); // Preview selected image
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Create FormData object
      const formData = new FormData();
      formData.append("username", username);
      formData.append("bio", bio);
      formData.append("role", role);
      if (selectedFile) {
        formData.append("file", selectedFile); // Attach the image file
      }

      const response = await fetch(`http://${serverUri}/api/user/createProfile`, {
        method: "POST",
        credentials: "include",  
        body: formData, // Send as FormData
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      onComplete(); // Call onComplete after success
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="max-w-md w-full space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold">Complete Your Profile</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          {role === "hero"
            ? "Tell us a bit about yourself to find the right Uplifters"
            : "Share your story to connect with Heroes who need your support"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Avatar Upload */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <Camera className="w-12 h-12 text-gray-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              )}
            </div>
            <label className="absolute bottom-0 right-0 bg-purple-500 rounded-full p-2 cursor-pointer">
              <Upload className="w-4 h-4 text-white" />
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Username Field */}
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Username
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            required
          />
        </div>

        {/* Bio Field */}
        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Bio
          </label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder={
              role === "hero"
                ? "What kind of motivation are you looking for?"
                : "How do you like to motivate and support others?"
            }
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md p-3">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? "Saving..." : "Complete Profile"}
        </button>
      </form>
    </div>
  );
};

export default ProfileSetup;
