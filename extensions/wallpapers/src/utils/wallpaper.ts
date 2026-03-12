import { exec, execSync } from "child_process";
import { showToast, Toast, WindowManagement as wm } from "@vicinae/api";
import { runConvertSplit, runPostProduction } from "./imagemagik";
import { callColorGen } from "./colorgen";
import { WPTarget, WPFilter, WPAnimation } from "./types";
import { Image, processImage } from "./image";
import { awww } from "./awww";

export async function applyFilter({
  image,
  filter,
}:{
  image: Image,
  filter: WPFilter,
}): Promise<Image> {
  // Add Filter to image
  // Return new image that has been filtered
  const processedImage = await runPostProduction(image.fullpath, filter.name);
  return await processImage(processedImage as string);
}

export async function applyImageTo(
  image: Image, 
  target: WPTarget,
  animation: WPAnimation,
): Promise<boolean> {

  let mon: string = "ALL";
  if ((target.mon instanceof String) && (target.mon !== "")) {
    mon = target.mon as string;
  }else if ((target.mon instanceof wm.Screen) && (target.mon !== undefined)) {
    mon = (target as wm.Screen).name;
  }

  try {
    //execSync(`awww query`+ 
    //      ((target?.ns) ?` --namespace ${target.ns}` : ``), { stdio: "pipe" });
    let awwwQry = awww.query();
    if (target?.ns) awwwQry = awwwQry.namespace(target.ns.name);
    await awwwQry.exec();

    return await new Promise<boolean>(async (resolve) => {
      //exec(
      //  `awww img ${image.fullpath} -t ${animation.type} --transition-step ${animation.steps} --transition-duration ${animation.duration} --transition-fps ${animation.fps}` + 
      //    ((target?.ns) ?` --namespace ${target.ns}` : ``)+ 
      //    ((mon !== "ALL") ?` --outputs ${mon}` : ``),
      //  (error: any) => {
      //    if (error) {
      //      resolve(false);
      //    } else {
      //      resolve(true);
      //    }
      //  },
      //);
      let query = awww.img(image.fullpath)
        .transitionType(animation.type)
        .transitionStep(animation.steps)
        .transitionDuration(animation.duration)
        .transitionFps(animation.fps);

      if (target?.ns) query = query.namespace(target.ns.name);
      if (target?.mon) query = query.outputs((target.mon instanceof String) ? target.mon : target.mon.name);

      await query.exec().then((res) => {
        resolve(true);
      }).catch((err) => {
        resolve(false);
      })
    });
  } catch (error) {
    return false;
  }

}

export async function setImage({
  image,
  target,
  filter,
}: {
  image: Image,
  target: WPTarget,
  filter?: WPFilter
}):Promise<boolean> {
  try {
    let wpImage: Image = image;
    if (filter) {
      wpImage = await applyFilter({ image, filter});
    };
    await applyImageTo(  )

  } catch (err: any) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to set Wallpaper",
      message: err.message
    });
  };
}

export async function omniCommand(
  path: string,
  monitor: string,
  transition: string,
  steps: number,
  duration: number,
  apptoggle: boolean,
  colorApp: string,
  postProduction: string,
  postCommandString: string,
  namespace: string = "",
  fps: number,
) {
  let success: boolean;

  if (monitor === "ALL") {
    success = await setWallpaper(path, transition, steps, duration, namespace, fps);
  } else if (monitor.includes("|")) {
    const splitImages = await runConvertSplit(path);
    const monitors = monitor.split("|");
    

    const ok1 = await setWallpaperOnMonitor(
      splitImages[0],
      monitors[0],
      transition,
      steps,
      duration,
      namespace,
      fps,
    );
    const ok2 = await setWallpaperOnMonitor(
      splitImages[1],
      monitors[1],
      transition,
      steps,
      duration,
      namespace,
      fps,
    );

    success = ok1 && ok2;
  } else {
    success = await setWallpaperOnMonitor(
      path,
      monitor,
      transition,
      steps,
      duration,
      namespace,
      fps,
    );
  }

  if (success) {
    if (apptoggle) {
      toggleVicinae();
    }
    if (colorApp !== "none") {
      const colorGenSuccess = await callColorGen(path, colorApp);

      if (colorGenSuccess) {
        showToast({
          style: Toast.Style.Success,
          title: "Wall set, colors generated!",
        });
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "Color generation failed",
        });
      }
    }
    if (postProduction !== "no") {
      const postProdSuccess = await runPostProduction(path, postProduction);

      if (postProdSuccess) {
        showToast({
          style: Toast.Style.Success,
          title: "Wall set, colors generated, post proc done!",
        });
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "Post processing failed",
        });
      }
    }
    if (postCommandString) {
      const postCommandSuccess = await execPostCommand(postCommandString, path, monitor, namespace);

      if (postCommandSuccess) {
        showToast({
          style: Toast.Style.Success,
          title: "Wall set, colors generated, post proc done, command ran!",
        });
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "Post command failed",
        });
      }
    }
  } else {
    showToast({
      style: Toast.Style.Failure,
      title: "ERROR: Check awww-daemon status",
      message:
        "Make sure awww is installed and its daemon is running (awww-daemon).",
    });
  }
}

export const setWallpaper = async (
  path: string,
  transition: string,
  steps: number,
  seconds: number,
  namespace: string = "",
  fps: number,
): Promise<boolean> => {
  try {
    execSync(`awww query`+ 
          ((namespace !== "") ?` --namespace ${namespace}` : ``), { stdio: "pipe" });

    return await new Promise<boolean>((resolve) => {
      exec(
        `awww img ${path} -t ${transition} --transition-step ${steps} --transition-duration ${seconds} --transition-fps ${fps}` + 
          ((namespace !== "") ?` --namespace ${namespace}` : ``),
        (error: any) => {
          if (error) {
            resolve(false);
          } else {
            resolve(true);
          }
        },
      );
    });
  } catch (error) {
    return false;
  }
};

export const setWallpaperOnMonitor = async (
  path: string,
  monitorName: string,
  transition: string,
  steps: number,
  seconds: number,
  namespace: string = "",
  fps: number,

): Promise<boolean> => {
  try {
    execSync(`awww query`+ 
          ((namespace !== "") ?` --namespace ${namespace}` : ``), { stdio: "pipe" });

    return await new Promise<boolean>((resolve) => {
      exec(
        `awww img ${path} --outputs "${monitorName}" -t ${transition} --transition-step ${steps} --transition-duration ${seconds} --transition-fps ${fps}`+ 
          ((namespace !== "") ?` --namespace ${namespace}` : ``),
        (error: any) => {
          if (error) {
            resolve(false);
          } else {
            resolve(true);
          }
        },
      );
    });
  } catch (error) {
    return false;
  }
};

export const toggleVicinae = (): void => {
  exec(`vicinae vicinae://toggle`);
};

export const execPostCommand = async (
  postCommand: string,
  imagePath: string,
  monitor: string,
  namespace: string = "",
): Promise<boolean> => {
  // Execute the command and check for errors
  console.log(postCommand);
  console.log(imagePath);
  return await new Promise<boolean>((resolve) => {
    const command = postCommand.replace(/\$\{wallpaper\}/g, imagePath)
      .replace(/\$\{monitor\}/g, monitor)
      .replace(/\$\{namespace\}/g, namespace);

    exec(command, (error) => {
      if (error) {
        console.error(`Post command failed: ${error.message}`);
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
};