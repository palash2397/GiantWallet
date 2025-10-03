import Joi from "joi";
import { User } from "../models/user/user.js";
import { ApiResponse } from "../utils/ApiReponse.js";
import { Foundation } from "../models/foundation/foundation.js";
import { Campaign } from "../models/foundation/campaign.js";
import { Faq } from "../models/admin/Faq.js";
import { deleteOldImages } from "../utils/helpers.js";
import { parseJsonArray } from "../utils/helpers.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";


export const createFoundationHandle = async (req, res) => {
  try {
    const { name, description, website } = req.body;
    const schema = Joi.object({
      name: Joi.string().min(3).required(),
      description: Joi.string().min(10).max(500).required(),
      website: Joi.string().optional(),
    });

    const { error } = schema.validate(req.body);

    if (error)
      return res
        .status(400)
        .json(new ApiResponse(400, {}, error.details[0].message));

    const user = await User.findOne({ _id: req.user.id });
    if (!user)
      return res.status(404).json(new ApiResponse(404, {}, `User not found`));
    
    const localFilePath = req.file ? req.file.path : null;

    let result;
    if (localFilePath) {
       result = await uploadOnCloudinary(localFilePath)
    }

    await Foundation.create({
      name,
      description,
      logo: req.file ? result.url : null,
      website: website ? website : null,
      userId: user._id,
    });

    return res
      .status(200)
      .json(new ApiResponse(200, {}, `foundation created successfully`));
  } catch (error) {
    console.log(`error while creating foundation ${error}`);
    res.status(500).json(new ApiResponse(500, {}, `Internal server error`));
  }
};

export const updateFoundationHandle = async (req, res) => {
  try {
    const { id, name, description, website } = req.body;
    const schema = Joi.object({
      id: Joi.string().min(3).max(30).optional(),
      name: Joi.string().min(3).optional(),
      description: Joi.string().min(10).max(500).optional(),
      website: Joi.string().optional(),
    });

    const { error } = schema.validate(req.body);

    if (error)
      return res
        .status(400)
        .json(new ApiResponse(400, {}, error.details[0].message));

    const user = await User.findOne({ _id: req.user.id });
    if (!user)
      return res.status(404).json(new ApiResponse(404, {}, `User not found`));

    const foundation = await Foundation.findOne({ _id: id });

    if (!foundation)
      return res
        .status(404)
        .json(new ApiResponse(404, {}, `Foundation not found`));

    if (req.file) deleteOldImages("foundation/logo", foundation.logo);

    name ? (foundation.name = name) : foundation.name;
    description
      ? (foundation.description = description)
      : foundation.description;
    website ? (foundation.website = website) : foundation.website;

    req.file ? (foundation.logo = req.file.filename) : foundation.logo;

    await foundation.save();

    return res
      .status(201)
      .json(new ApiResponse(200, {}, `foundation update successful`));
  } catch (error) {
    console.log(`error while creating foundation ${error}`);
    res.status(500).json(new ApiResponse(500, {}, `Internal server error`));
  }
};

export const getFoundationHandle = async (req, res) => {
  try {
    const { id } = req.query;

    if (id) {
      const data = await Foundation.findOne({ _id: id }).populate(
        "userId",
        "_id fullName email"
      );

      if (!data)
        return res
          .status(401)
          .json(new ApiResponse(400, {}, `Foundation not found`));

      data.logo = data.logo
        ? data.logo
        : `${process.env.DEFAULT_IMAGE}`;

      return res
        .status(200)
        .json(
          new ApiResponse(200, data, `Foundation data fetched successfully`)
        );
    }

    const data = await Foundation.find();

    if (!data || data.length < 0)
      return res.status(401).json(new ApiResponse(400, {}, `data not found`));

    data.map((item) => {
      item.logo = item.logo
        ? item.logo
        : `${process.env.DEFAULT_IMAGE}`;
    });

    return res
      .status(200)
      .json(new ApiResponse(200, data, `Foundation data fetched successfully`));
  } catch (error) {
    console.log(`error while getting foundation ${error}`);
    res.status(500).json(new ApiResponse(500, {}, `Internal server error`));
  }
};

export const deleteFoundationHandle = async (req, res) => {
  try {
    const { id } = req.query;

    const schema = Joi.object({
      id: Joi.string().required(),
    });

    const { error } = schema.validate({ id });

    if (error)
      return res
        .status(400)
        .json(new ApiResponse(400, {}, error.details[0].message));

    const user = await User.findOne({ _id: req.user.id });
    if (!user)
      return res.status(404).json(new ApiResponse(404, {}, `User not found`));

    const foundation = await Foundation.findOne({
      _id: id,
      userId: req.user.id,
    });

    if (!foundation)
      return res
        .status(404)
        .json(new ApiResponse(404, {}, `Foundation not found`));

    const campaigns = await Campaign.find({ foundation: id });

    for (const campaign of campaigns) {
      if (campaign.image) {
        deleteOldImages("foundation/campaign", campaign.image);
      }
      await campaign.deleteOne();
    }

    if (foundation.logo) {
      deleteOldImages("foundation/logo", foundation.logo);
    }

    await Foundation.deleteOne({ _id: id });

    return res
      .status(201)
      .json(new ApiResponse(200, {}, `Foundation deleted successfully`));
  } catch (error) {
    console.log(`error while deleting foundation ${error}`);
    res.status(500).json(new ApiResponse(500, {}, `Internal server error`));
  }
};

export const createCampaignHandle = async (req, res) => {
  try {
    const participants = parseJsonArray("participants", req);
    const { foundationId, title, description, eventDate, location } = req.body;
    const schema = Joi.object({
      foundationId: Joi.string().required(),
      title: Joi.string().min(3).required(),
      description: Joi.string().min(10).max(500).required(),
      eventDate: Joi.string().required(),
      location: Joi.string().required(),
      participants: Joi.array()
        .items(Joi.string().required())
        .min(1)
        .required(),
    });

    console.log(`req.participants ---------->`, participants);

    const { error } = schema.validate({
      foundationId,
      title,
      description,
      eventDate,
      location,
      participants,
    });

    if (error)
      return res
        .status(400)
        .json(new ApiResponse(400, {}, error.details[0].message));

    const user = await User.findOne({ _id: req.user.id });
    if (!user)
      return res.status(404).json(new ApiResponse(404, {}, `User not found`));

    const foundation = await Foundation.findOne({
      _id: foundationId,
      userId: req.user.id,
    });
    if (!foundation)
      return res
        .status(404)
        .json(new ApiResponse(404, {}, `foundation not found`));

    const data = await Campaign.create({
      foundation: foundationId,
      title: title,
      description: description,
      eventDate: eventDate,
      image: req.file ? req.file.filename : "",
      location: location,
      participants: participants,
    });

    return res
      .status(201)
      .json(new ApiResponse(200, data._id, `Campaign created successfully `));
  } catch (error) {
    console.log(`error while getting foundation ${error}`);
    res.status(500).json(new ApiResponse(500, {}, `Internal server error`));
  }
};

export const getCampaignHandle = async (req, res) => {
  try {
    const { foundationId, campaignId } = req.body;
    const schema = Joi.object({
      foundationId: Joi.string().required(),
    });

    const { error } = schema.validate({ foundationId });

    if (error)
      return res
        .status(400)
        .json(new ApiResponse(400, {}, error.details[0].message));

    const foundation = await Foundation.findOne({
      _id: foundationId,
    });
    if (!foundation)
      return res
        .status(404)
        .json(new ApiResponse(404, {}, `foundation not found`));

    if (campaignId) {
      const campaign = await Campaign.findOne({ _id: campaignId })
        .populate("participants", "_id fullName avatar")
        .select("-__v -createdAt -updatedAt");
      if (!campaign)
        return res
          .status(404)
          .json(new ApiResponse(404, {}, `campaign not found`));

      campaign.image = campaign.image
        ? `${process.env.BASE_URL}/foundation/campaign/${campaign.image}`
        : process.env.DEFAULT_IMAGE;

      campaign.participants.map((item) => {
        item.avatar = item.avatar
          ? `${process.env.BASE_URL}/foundation/logo/${item.image}`
          : process.env.DEFAULT_PROFILE_PIC;
      });
      return res
        .status(201)
        .json(new ApiResponse(200, campaign, `campaign fetched successfully`));
    }

    const campaigns = await Campaign.find({
      foundation: foundationId,
    })
      .populate("participants", "_id fullName avatar")
      .select("-__v -createdAt -updatedAt");

    if (!campaigns || campaigns.length == 0)
      return res.status(401).json(new ApiResponse(400, {}, `data not found`));

    campaigns.forEach((data) => {
      data.image = data.image
        ? `${process.env.BASE_URL}/foundation/campaign/${data.image}`
        : process.env.DEFAULT_IMAGE;

      if (data.participants && data.participants.length > 0) {
        data.participants.forEach((item) => {
          if (!item.avatar) {
            item.avatar = process.env.DEFAULT_PROFILE_PIC;
          } else if (item.avatar.startsWith("http")) {
            item.avatar = item.avatar;
          } else {
            item.avatar = `${process.env.BASE_URL}/foundation/logo/${item.avatar}`;
          }
        });
      }
    });

    return res
      .status(201)
      .json(new ApiResponse(200, campaigns, `campaigns fetched successfully`));
  } catch (error) {
    console.log(`error while getting campaign ${error}`);
    res.status(500).json(new ApiResponse(500, {}, `Internal server error`));
  }
};

export const updateCampaignHandle = async (req, res) => {
  try {
    
  } catch (error) {
    console.log(`error while updating campaign ${error}`);
    res.status(500).json(new ApiResponse(500, {}, `Internal server error`));
  }
};

export const deleteCampaignHandle = async (req, res) => {
  try {
    const { foundationId, campaignId } = req.body;
    const schema = Joi.object({
      foundationId: Joi.string().required(),
      campaignId: Joi.string().required(),
    });

    const { error } = schema.validate(req.body);

    if (error)
      return res
        .status(400)
        .json(new ApiResponse(400, {}, error.details[0].message));

    const foundation = await Foundation.findOne({
      _id: foundationId,
      userId: req.user.id,
    });
    if (!foundation)
      return res
        .status(404)
        .json(new ApiResponse(404, {}, `foundation not found`));

    const campaign = await Campaign.findOne({
      _id: campaignId,
      foundation: foundationId,
    });

    if (!campaign)
      return res
        .status(404)
        .json(new ApiResponse(404, {}, `foundation not found`));

    deleteOldImages("foundation/campaign", campaign.image);
    await Campaign.deleteOne({
      _id: campaignId,
    });

    res
      .status(201)
      .json(new ApiResponse(201, {}, `campaign deleted successfully`));
  } catch (error) {
    console.log(`error while updating campaign ${error}`);
    res.status(500).json(new ApiResponse(500, {}, `Internal server error`));
  }
};

export const addFaqHandle = async (req, res) => {
  try {
    const { que, ans } = req.body;
    const schema = Joi.object({
      que: Joi.string().required(),
      ans: Joi.string().required(),
    });

    const { error } = schema.validate(req.body);

    if (error)
      return res
        .status(400)
        .json(new ApiResponse(400, {}, error.details[0].message));

    const user = await User.findOne({ _id: req.user.id });
    if (!user)
      return res.status(404).json(new ApiResponse(404, {}, `User not found`));

    const data = await Faq.create({
      question: que,
      answer: ans,
    });

    return res
      .status(201)
      .json(new ApiResponse(200, data._id, `Faq added successfully`));
  } catch (error) {
    console.log(`error while adding faq ${error}`);
    res.status(500).json(new ApiResponse(500, {}, `Internal server error`));
  }
};

export const getFaqHandle = async (req, res) => {
  try {
    const data = await Faq.find().select("-__v -createdAt -updatedAt");

    return res
      .status(201)
      .json(new ApiResponse(200, data, `Faq added successfully`));
  } catch (error) {
    console.log(`error while getting faq ${error}`);
    res.status(500).json(new ApiResponse(500, {}, `Internal server error`));
  }
};

export const deleteFaqHandle = async (req, res) => {
  try {
    const { id } = req.query;

    const schema = Joi.object({
      id: Joi.string().required(),
    });

    const { error } = schema.validate({ id });

    if (error)
      return res
        .status(400)
        .json(new ApiResponse(400, {}, error.details[0].message));

    await Faq.deleteOne({ _id: id });
    res.status(201).json(new ApiResponse(200, {}, `faq deleted successfully`));
  } catch (error) {
    console.log(`error while deleting faq ${error}`);
    res.status(500).json(new ApiResponse(500, {}, `Internal server error`));
  }
};
