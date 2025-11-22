import OS from "../../core/OS";

const useOS = () => {
  const os = new OS();
  os.initialize();

  return os;
};

export default useOS;
