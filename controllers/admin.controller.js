import Joi from "joi";
import { User } from "../models/user/user.js";
import { ApiResponse } from "../utils/ApiReponse.js";
import { Foundation } from "../models/foundation/foundation.js";
import { deleteOldImages } from "../utils/helpers.js";

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

    await Foundation.create({
      name,
      description,
      logo: req.file ? req.file.filename : null,
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

    const user = await User.findOne({ _id: req.user.id });
    if (!user)
      return res.status(401).json(new ApiResponse(400, {}, `User not found`));

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
        ? `${process.env.BASE_URL}/foundation/logo/${data.logo}`
        : `${process.env.DEFAULT_IMAGE}`;

      return res
        .status(200)
        .json(
          new ApiResponse(200, data, `Foundation data fetched successfully`)
        );
    }

    const data = await Foundation.find({ userId: req.user.id });

    if (!data || data.length < 0)
      return res.status(401).json(new ApiResponse(400, {}, `data not found`));

    data.map((item) => {
      item.logo = item.logo
        ? `${process.env.BASE_URL}/foundation/logo/${item.logo}`
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

// export const deleteFoundationHandle= async(req, res)=>{

// }

export const createCampaignHandle = async (req, res) => {
  try {
    const { title, description, eventDate, location, participants } = req.body;
    const schema = Joi.object({
      title: Joi.string().min(3).required(),
      description: Joi.string().min(10).max(500).required(),
      eventDate: Joi.string().required(),
      location: Joi.string().required(),
      participants: Joi.array()
        .items(Joi.string().required())
        .min(1)
        .required(),
    });

    console.log(`req.participants ---------->`, participants)

    const { error } = schema.validate(req.body);
    if (error)
      return res
        .status(400)
        .json(new ApiResponse(400, {}, error.details[0].message));

    const user = await User.findOne({ _id: req.user.id });
    if (!user)
      return res.status(404).json(new ApiResponse(404, {}, `User not found`));
  } catch (error) {
    console.log(`error while getting foundation ${error}`);
    res.status(500).json(new ApiResponse(500, {}, `Internal server error`));
  }
};
